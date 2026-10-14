import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe,expect,it } from "vitest";
import Decimal from "decimal.js";
import { OPENING_MESSAGE } from "@/lib/advisor/events";
import { scriptedTurn } from "@/lib/advisor/fixtures";
import { applyOp,type PlanOp } from "@/lib/plan/ops";
import { type Plan } from "@/lib/plan/types";
import { AdvisorScreen } from "./advisor-screen";
import { LightMarkdown } from "./markdown";
import { money,PlanView,planSummary } from "./plan-view";
import { WrapUpCard } from "./wrap-up-card";
import { SharePanel } from "./share-panel";
function change(plan: Plan,op: PlanOp) {
  const result=applyOp(plan,op,"user");
  if(!result.ok)
    throw new Error(result.error);
  return result.plan;
}
const demoPlan=() => scriptedTurn(1,scriptedTurn(0).plan).plan;
describe("living plan presentation",() => {
  it("server-renders the greeting and disclosure without waiting for a browser or fetch",() => {
    const html=renderToStaticMarkup(createElement(AdvisorScreen));
    expect(html).toContain("an AI tech advisor run by Kenac Computer Systems");
    expect(html).toContain(OPENING_MESSAGE.split("\n\n")[1]);
    expect(html).toContain('href="/privacy"');
    expect(html).not.toContain('type="email"');
  });
  it("offers a reset only for server-authorised demo mode and starts with the greeting", () => {
    const demo=renderToStaticMarkup(createElement(AdvisorScreen,{ demo: true }));
    expect(demo).toContain("Start over");
    expect(demo).toContain(OPENING_MESSAGE.split("\n\n")[1]);
    expect(demo).not.toContain("Welcome back");
    expect(renderToStaticMarkup(createElement(AdvisorScreen))).not.toContain("Start over");
    expect(demo).toContain("Dark: HUD mode");
    expect(demo).toContain("Shift+Enter for a new line");
  });
  it("renders human dates in cards, chart tooltips and accessible month tables", () => {
    const plan=scriptedTurn(1,scriptedTurn(0,undefined,true).plan,true).plan;
    const html=renderToStaticMarkup(createElement(PlanView,{ plan,changed: {},disabled: false,onOp: async () => true }));
    expect(html).toContain("Mar 2027");
    expect(html).toContain("Jan–Dec 2027");
    expect(html).toContain("View payments for Aug 2027");
    expect(html).not.toMatch(/\b\d{4}-\d{2}\b/);
  });
  it("uses the same human month in the per-line sharing preview", () => {
    let plan=demoPlan();
    plan=change(plan,{ op: "set_state",id: plan.lines[0].id,state: "accepted" });
    plan=change(plan,{ op: "set_sharing",id: plan.lines[0].id,shared: true,shareAllocation: false });
    const html=renderToStaticMarkup(createElement(SharePanel,{ plan,saved: true,contact: { name: "Demo presenter",email: "demo@example.com",organisation: "Demo organisation",role: "CTO",consentEmail: true,consentContact: false } }));
    expect(html).toContain("Mar 2027");
    expect(html).not.toMatch(/\b\d{4}-\d{2}\b/);
  });
  it("never represents unpriced lines as a zero-valued budget",() => {
    const plan=demoPlan();
    const html=renderToStaticMarkup(createElement(PlanView,{ plan,changed: {},disabled: false,onOp: async () => true }));
    expect(html).toContain("Unpriced");
    expect(html).not.toContain("US$0");
    expect(planSummary(plan)).toMatchObject({ amount: "Awaiting prices",unpriced: 3,complete: false });
  });
  it("totals accepted estimates only and keeps foreign prices unconverted",() => {
    let plan=demoPlan();
    const id=plan.lines[0].id;
    plan=change(plan,{ op: "price_line",id,price: { unitPrice: "1234.56",currency: "USD",evidence: { type: "USER_ESTIMATE",reference: "Own estimate",capturedAt: new Date().toISOString() } } });
    expect(planSummary(plan).hasAmount).toBe(false);
    plan=change(plan,{ op: "set_state",id,state: "accepted" });
    expect(planSummary(plan).amount).toBe("US$4,938.24 so far");
    plan=change(plan,{ op: "set_state",id,state: "dismissed",reason: "Wait for a quote" });
    expect(planSummary(plan).hasAmount).toBe(false);
    plan=change(plan,{ op: "set_state",id,state: "accepted" });
    plan=change(plan,{ op: "price_line",id,price: { unitPrice: "1000",currency: "ZAR",evidence: { type: "USER_ESTIMATE",reference: "Own estimate",capturedAt: new Date().toISOString() } } });
    expect(planSummary(plan).totals.unconvertedLineIds).toContain(id);
    expect(planSummary(plan).amount).toBe("Awaiting prices");
  });
  it("formats large money values without converting decimal money to floats",() => {
    expect(money(new Decimal("99999999999999999999.99"),"USD")).toBe("US$99,999,999,999,999,999,999.99");
  });
  it("renders wrap-up summary with T3's children slot",() => {
    const html=renderToStaticMarkup(createElement(WrapUpCard,{ summary: "Two lines need quotes." },createElement("button",null,"Save my plan")));
    expect(html).toContain("Two lines need quotes.");
    expect(html).toContain("Save my plan");
  });
  it("renders only bold and lists from markdown, escaping model HTML",() => {
    const html=renderToStaticMarkup(createElement(LightMarkdown,{ text: "**Power first**\n\n- UPS\n- Solar\n\n<script>bad()</script>" }));
    expect(html).toContain("<strong>Power first</strong>");
    expect(html).toContain("<ul");
    expect(html).not.toContain("<script>");
  });
});
