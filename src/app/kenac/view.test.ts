import { expect, it } from "vitest";
import { SharedRow } from "@/lib/export/sharing";
import { kenacHtml } from "./view";
it("escapes shared field markup and the CSP nonce in the no-JS view", () => {
  const row = SharedRow.parse({ lineId: "l1", item: "<script>alert(1)</script>", quantity: 1, unit: "item", timing: "2027-01", frequency: "one_off", category: "Hardware", notes: '"<img src=x onerror=alert(1)>', sharedAt: null });
  const html = kenacHtml([row], '\" onload=\"bad');
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("<img src=x");
  expect(html).toContain('nonce="&quot; onload=&quot;bad"');
  expect(html).toContain("prefers-color-scheme:dark");
});
