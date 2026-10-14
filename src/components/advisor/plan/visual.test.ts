import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { scriptedTurn } from "@/lib/advisor/fixtures";
import { catalogueDisplay } from "@/lib/pricing/catalogue-display";
import { PlanView } from "../plan-view";
import { LineVisual } from "./visual";

const plan = () => scriptedTurn(1, scriptedTurn(0, undefined, true).plan, true).plan;
it("describes documented demo imagery and category artwork accessibly", () => {
  const lines = plan().lines;
  const solar = renderToStaticMarkup(createElement(LineVisual, { line: lines[0] }));
  const category = renderToStaticMarkup(createElement(LineVisual, { line: lines[1] }));
  for (const html of [solar, category]) {
    expect(html).toContain("<figcaption>Illustration</figcaption>");
  }
  expect(solar).toContain('aria-label="Power illustration"');
  expect(solar).not.toContain("<img");
  expect(solar).not.toContain("Kenac");
  expect(category).toContain('role="img"');
  expect(category).toContain('aria-label="Professional services illustration"');
  expect(category).toContain("mask-image:");
});
it("uses category art for an estimate even if it contains product metadata, and rejects protocol-relative imagery", () => {
  const line = plan().lines[0];
  const priceList = { ...plan().lines[2].price!, product: {
    sku: "TEST-KIT", name: "Test sourced kit", imageUrl: "/catalogue/demo/solar-ups.svg",
  } };
  for (const price of [
    { ...priceList, evidence: { ...priceList.evidence, type: "USER_ESTIMATE" as const } },
    { ...priceList, product: { ...priceList.product, imageUrl: "//external.example/item.svg" } },
  ]) {
    const html = renderToStaticMarkup(createElement(LineVisual, { line: { ...line, price } }));
    expect(html).toContain('aria-label="Power illustration"');
    expect(html).not.toContain("<img");
  }
});
it("shows official unpriced family photos, Kenac disclosure and supply copy without changing the plan", () => {
  const demo = plan();
  const before = structuredClone(demo);
  for (const line of demo.lines.slice(-3)) {
    const supply = catalogueDisplay(line)!;
    const image = renderToStaticMarkup(createElement(LineVisual, { line, large: true }));
    expect(image).toContain(`src="${supply.imageUrl}"`);
    expect(image).toContain(`alt="${supply.name}"`);
    expect(image).toContain("<figcaption>Product image</figcaption>");
    expect(image).toContain(">Kenac</span>");
    const card = renderToStaticMarkup(createElement(PlanView, {
      plan: { ...demo, lines: [line] }, changed: {}, disabled: false, onOp: async () => true,
    }));
    expect(card).toContain(">Kenac</span>");
    expect(card).toContain("Kenac can supply · price on request");
    expect(card).toContain("Unpriced");
    expect(card).toContain("Awaiting prices");
    expect(card).not.toContain("US$0");
  }
  expect(demo).toEqual(before);
});
it("preserves sourced product imagery and suppresses catalogue display when an equipment line has an own estimate", () => {
  const demo = plan();
  const line = demo.lines.at(-3)!;
  const sourced = { ...demo.lines[2].price!, product: {
    sku: "SOURCED-DEVICE", name: "Sourced device", imageUrl: "/catalogue/test/device.png",
  } };
  const image = renderToStaticMarkup(createElement(LineVisual, { line: { ...line, price: sourced } }));
  expect(image).toContain('src="/catalogue/test/device.png"');
  expect(image).toContain('alt="Sourced device"');
  expect(image).not.toContain("/catalogue/kenac/");
  const estimated = { ...line, price: { ...sourced, evidence: {
    type: "USER_ESTIMATE" as const, reference: "Own estimate", capturedAt: "2026-10-14",
  } } };
  const card = renderToStaticMarkup(createElement(PlanView, {
    plan: { ...demo, lines: [estimated] }, changed: {}, disabled: false, onOp: async () => true,
  }));
  expect(card).toContain("Own estimate");
  expect(card).toContain('aria-label="Cybersecurity illustration"');
  expect(card).not.toContain("<img");
  expect(card).not.toContain(">Kenac</span>");
  expect(card).not.toContain("Kenac can supply");
});
