import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { scriptedTurn } from "@/lib/advisor/fixtures";
import { LineVisual } from "./visual";

const plan = () => scriptedTurn(1, scriptedTurn(0, undefined, true).plan, true).plan;
it("describes documented demo imagery and category artwork accessibly", () => {
  const lines = plan().lines;
  const product = renderToStaticMarkup(createElement(LineVisual, { line: lines[0] }));
  const category = renderToStaticMarkup(createElement(LineVisual, { line: lines[1] }));
  for (const html of [product, category]) {
    expect(html).toContain("<figcaption>Illustration</figcaption>");
  }
  expect(product).toContain('src="/catalogue/demo/solar-ups.svg"');
  expect(product).toContain('alt="Generic branch solar and UPS kit"');
  expect(category).toContain('role="img"');
  expect(category).toContain('aria-label="Professional services illustration"');
  expect(category).toContain("mask-image:");
});
it("uses category art for an estimate even if it contains product metadata, and rejects protocol-relative imagery", () => {
  const line = plan().lines[0];
  for (const price of [
    { ...line.price!, evidence: { ...line.price!.evidence, type: "USER_ESTIMATE" as const } },
    { ...line.price!, product: { ...line.price!.product!, imageUrl: "//external.example/item.svg" } },
  ]) {
    const html = renderToStaticMarkup(createElement(LineVisual, { line: { ...line, price } }));
    expect(html).toContain('aria-label="Power illustration"');
    expect(html).not.toContain("<img");
  }
});
