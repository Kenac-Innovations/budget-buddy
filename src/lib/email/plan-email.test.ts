import nodemailer from "nodemailer";
import { describe, expect, it, vi } from "vitest";
import { applyOp } from "@/lib/plan/ops";
import { InMemorySessionStore } from "@/lib/session/store";
import { planLinks, sendPlanEmail } from "./plan-email";
const env = { APP_URL: "https://plan.example.test" };
async function savedSession() {
  const store = new InMemorySessionStore();
  const session = await store.create();
  const result = applyOp(session.plan, { op: "add_line", initiativeId: null, title: "UPS", category: "Power", quantity: 1, frequency: "one_off" }, "user");
  if (!result.ok) throw new Error(result.error);
  await store.updatePlan(session.id, result.plan);
  await store.save(session.id, { name: "Test", email: "cto@example.test", organisation: "A < B", role: "CTO", consentEmail: true, consentContact: false });
  return (await store.findByToken(session.token))!;
}

describe("plan email", () => {
  it("skips SMTP while returning the saved private link", async () => {
    const session = await savedSession();
    expect(await sendPlanEmail(session, { env })).toMatchObject({ emailed: false, returnUrl: `${env.APP_URL}/r/${session.token}` });
  });

  it("sends text and HTML containing the private link with a test transport", async () => {
    const session = await savedSession();
    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
    const send = vi.spyOn(transport, "sendMail");
    expect((await sendPlanEmail(session, { env, transport, buildWorkbook: null })).emailed).toBe(true);
    const mail = send.mock.calls[0][0];
    expect(mail.text).toContain(`${env.APP_URL}/r/${session.token}`);
    expect(mail.html).toContain(`${env.APP_URL}/r/${session.token}`);
    expect(mail.text).toContain("1 line still to price");
    expect(mail.text).toContain("Open your private return link first");
    expect(mail.text).toContain("Kenac Computer Systems");
  });

  it("attaches the workbook by default now that the export module exists", async () => {
    const session = await savedSession();
    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
    const send = vi.spyOn(transport, "sendMail");
    expect((await sendPlanEmail(session, { env, transport })).emailed).toBe(true);
    const mail = send.mock.calls[0][0];
    expect(mail.text).toContain("Your Excel file is attached.");
    expect(mail.text).not.toContain("US$0.00");
    expect(mail.attachments).toHaveLength(1);
  });

  it("attaches T5's workbook and supplies saved organisation and role", async () => {
    const session = await savedSession();
    const buildWorkbook = vi.fn(async () => Buffer.from("xlsx-fixture"));
    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
    const send = vi.spyOn(transport, "sendMail");
    const result = await sendPlanEmail(session, { env, transport, buildWorkbook });
    expect(result.emailed).toBe(true);
    expect(buildWorkbook).toHaveBeenCalledWith(session.plan, { organisation: "A < B", role: "CTO" });
    expect(send.mock.calls[0][0].attachments?.[0]).toMatchObject({ filename: "ICT-plan-2027.xlsx", content: Buffer.from("xlsx-fixture") });
  });

  it("keeps the return link on SMTP failures, rejected recipients and workbook failures without logging", async () => {
    const session = await savedSession();
    const log = vi.spyOn(console, "log");
    const error = vi.spyOn(console, "error");
    const transport = { sendMail: vi.fn().mockRejectedValue(new Error("contains private recipient")) };
    expect((await sendPlanEmail(session, { env, transport, buildWorkbook: null })).emailed).toBe(false);
    transport.sendMail.mockResolvedValue({ rejected: ["cto@example.test"] });
    expect((await sendPlanEmail(session, { env, transport, buildWorkbook: null })).emailed).toBe(false);
    expect((await sendPlanEmail(session, { env, transport, buildWorkbook: async () => { throw new Error("Workbook failed"); } })).emailed).toBe(false);
    expect(log).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("validates APP_URL and prevents header/token injection", () => {
    expect(() => planLinks("a".repeat(43), "javascript:alert(1)")).toThrow();
    expect(() => planLinks("a".repeat(43), "https://user:pass@example.test")).toThrow();
    expect(() => planLinks("bad/token", env.APP_URL)).toThrow();
    expect(planLinks("a".repeat(43), `${env.APP_URL}/`)).toMatchObject({ returnUrl: `${env.APP_URL}/r/${"a".repeat(43)}` });
  });
});
