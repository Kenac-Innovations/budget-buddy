import { expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
import nodemailer from "nodemailer";
import { z } from "zod";
import { sendPlanEmail } from "@/lib/email/plan-email";
import { InMemorySessionStore } from "@/lib/session/store";
import { exportDemoPlan } from "./fixtures";

it("T3 discovers the real workbook builder and attaches a valid saved-organisation workbook", async () => {
  const store = new InMemorySessionStore();
  const session = await store.create();
  await store.updatePlan(session.id, exportDemoPlan());
  await store.save(session.id, { name: "Demo CIO", email: "demo@example.test", organisation: "Demo organisation", role: "CIO", consentEmail: true, consentContact: false });
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const send = vi.spyOn(transport, "sendMail");
  const saved = (await store.findByToken(session.token))!;
  expect((await sendPlanEmail(saved, { transport, env: { APP_URL: "https://example.test" } })).emailed).toBe(true);
  const attachment = send.mock.calls[0][0].attachments![0];
  expect(attachment.filename).toBe("ICT-plan-2027.xlsx");
  const buffer = z.instanceof(Buffer).parse(attachment.content);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(buffer) as unknown as ExcelJS.Buffer);
  expect(workbook.getWorksheet("Summary")!.getCell("B5").value).toBe("Demo organisation");
  expect(workbook.getWorksheet("Summary")!.getCell("B10").result).toBe(49401);
});
