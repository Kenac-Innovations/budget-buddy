import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseToolInput, toolParameters } from "./schema";
import { createToolRegistry } from ".";

describe("strict tool schema adapter", () => {
  it("requires every nested field, disallows extras and removes defaults", () => {
    const definitions = createToolRegistry().definitions();
    const walk = (value: unknown) => {
      if (!value || typeof value !== "object") return;
      const node = value as Record<string, unknown>;
      expect(node).not.toHaveProperty("default");
      if (node.properties) {
        expect(node.additionalProperties).toBe(false);
        expect(node.required).toEqual(Object.keys(node.properties));
      }
      Object.values(node).forEach((v) => Array.isArray(v) ? v.forEach(walk) : walk(v));
    };
    definitions.forEach((d) => { expect(d.strict).toBe(true); walk(d.parameters); });
    expect(definitions.find((d) => d.name === "add_objective")?.parameters).toMatchObject({
      required: ["title", "measure"], properties: { measure: { anyOf: [{ type: "string", maxLength: 200 }, { type: "null" }] } },
    });
  });

  it("omits optional wire nulls but preserves required nullable fields", () => {
    const schema = z.object({ quantity: z.number().nullable(), note: z.string().optional(),
      nested: z.object({ date: z.string().optional() }), values: z.array(z.object({ label: z.string().optional() })) });
    expect(parseToolInput(schema, { quantity: null, note: null, nested: { date: null }, values: [{ label: null }] }))
      .toEqual({ quantity: null, nested: {}, values: [{}] });
    expect(() => parseToolInput(schema, { quantity: null, nested: { secret: "bad" }, values: [] })).toThrow();
    expect(() => parseToolInput(schema, { quantity: "bad", nested: {}, values: [] })).toThrow();
    expect(toolParameters(schema)).toHaveProperty("additionalProperties", false);
  });
});
