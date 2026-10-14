import { z } from "zod";

type JsonSchema = Record<string, unknown>;

/** Responses strict mode requires every property; optional inputs use null on the wire. */
export function toolParameters(schema: z.ZodType): JsonSchema {
  return strictSchema(z.toJSONSchema(schema, { io: "input", target: "draft-7" }));
}

function strictSchema(source: JsonSchema): JsonSchema {
  const out = { ...source };
  delete out.$schema;
  delete out.default;
  if (source.properties) {
    const required = new Set(source.required as string[] | undefined);
    const properties = source.properties as Record<string, JsonSchema>;
    out.properties = Object.fromEntries(Object.entries(properties).map(([key, value]) => {
      const child = strictSchema(value);
      return [key, required.has(key) ? child : { anyOf: [child, { type: "null" }] }];
    }));
    out.required = Object.keys(properties);
    out.additionalProperties = false;
  }
  if (source.items) out.items = strictSchema(source.items as JsonSchema);
  for (const key of ["anyOf", "oneOf", "allOf"]) {
    if (Array.isArray(source[key])) out[key] = source[key].map(strictSchema);
  }
  return out;
}

/** Remove wire nulls only from originally optional fields; retain real nullable values. */
export function parseToolInput(schema: z.ZodType, input: unknown): unknown {
  const json = z.toJSONSchema(schema, { io: "input", target: "draft-7" });
  const normalized = normalize(json, input);
  return omitInjectedDefaults(json, schema.parse(normalized), normalized);
}

function omitInjectedDefaults(schema: JsonSchema, parsed: unknown, input: unknown): unknown {
  if (schema.properties && parsed && typeof parsed === "object" && input && typeof input === "object") {
    const properties = schema.properties as Record<string, JsonSchema>;
    const supplied = input as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).filter(([key]) => key in supplied)
      .map(([key, value]) => [key, omitInjectedDefaults(properties[key], value, supplied[key])]));
  }
  if (Array.isArray(parsed) && Array.isArray(input) && schema.items) {
    return parsed.map((value, index) => omitInjectedDefaults(schema.items as JsonSchema, value, input[index]));
  }
  return parsed;
}

function normalize(schema: JsonSchema, value: unknown): unknown {
  if (schema.properties && value !== null && typeof value === "object" && !Array.isArray(value)) {
    const properties = schema.properties as Record<string, JsonSchema>;
    const required = new Set(schema.required as string[] | undefined);
    return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
      if (!(key in properties)) throw new Error("Unexpected tool property");
      if (child === null && !required.has(key)) return [];
      return [[key, normalize(properties[key], child)]];
    }));
  }
  if (Array.isArray(value) && schema.items) return value.map((v) => normalize(schema.items as JsonSchema, v));
  return value;
}
