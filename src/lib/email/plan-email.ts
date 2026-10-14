import nodemailer, { type Transporter } from "nodemailer";
import { z } from "zod";
import { Plan } from "@/lib/plan/types";
import { planTotals } from "@/lib/plan/totals";
import { ContactInput, SessionToken } from "@/lib/session/prisma-store";
import type { AdvisorSessionRecord } from "@/lib/session/store";

const AppUrl = z.string().url().refine((value) => {
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash;
});
const SmtpConfig = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  MAIL_FROM: z.string().email(),
}).refine((env) => Boolean(env.SMTP_USER) === Boolean(env.SMTP_PASS));

type WorkbookBuilder = (plan: Plan, meta: { organisation: string; role: string }) => Promise<Buffer>;
type EmailOptions = {
  env?: Record<string, string | undefined>;
  transport?: Pick<Transporter, "sendMail">;
  buildWorkbook?: WorkbookBuilder | null;
};

export function planLinks(token: string, appUrl = process.env.APP_URL) {
  const base = AppUrl.parse(appUrl).replace(/\/$/, "");
  return {
    returnUrl: `${base}/r/${SessionToken.parse(token)}`,
    exportUrl: `${base}/api/export/xlsx`,
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

async function optionalWorkbook(): Promise<WorkbookBuilder | null> {
  try {
    // T5 owns this optional module. The literal import lets Next bundle it when present.
    // Widen the specifier for TypeScript while the optional module is absent.
    const workbookModule = await import("@/lib/export/workbook" as string);
    return typeof workbookModule.buildWorkbook === "function" ? workbookModule.buildWorkbook : null;
  } catch (error) {
    if (error instanceof Error && "code" in error &&
      ["MODULE_NOT_FOUND", "ERR_MODULE_NOT_FOUND"].includes(String(error.code))) return null;
    throw error;
  }
}

/** Delivery failures never undo saving. No recipient, name, token or provider error is logged. */
export async function sendPlanEmail(session: AdvisorSessionRecord, options: EmailOptions = {}) {
  const env = options.env ?? process.env;
  const links = planLinks(session.token, env.APP_URL);
  const smtp = SmtpConfig.safeParse(env);
  if (!options.transport && !smtp.success) return { emailed: false, ...links };
  try {
    const contact = ContactInput.parse(session.contact);
    const plan = Plan.parse(session.plan);
    const totals = planTotals(plan);
    const summary = `${plan.objectives.filter((o) => o.state === "accepted").length} objectives, ${plan.initiatives.filter((i) => i.state === "accepted").length} initiatives, ${totals.reportingCurrency} ${totals.reportingTotal.toFixed(2)} planned so far, and ${totals.unpricedLineIds.length} lines still to price${totals.unconvertedLineIds.length ? `; ${totals.unconvertedLineIds.length} lines need an exchange rate` : ""}.`;
    const builder = options.buildWorkbook === undefined ? await optionalWorkbook() : options.buildWorkbook;
    const attachments = builder ? [{
      filename: "ICT-plan-2027.xlsx",
      content: z.instanceof(Buffer).parse(await builder(plan, { organisation: contact.organisation, role: contact.role })),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }] : [];
    const downloadNote = attachments.length ? "Your Excel file is attached." : `Open your private return link first, then download your Excel file: ${links.exportUrl}`;
    const text = `Your ICT plan is saved.\n\n${summary}\n\nCome back to your private plan: ${links.returnUrl}\n\n${downloadNote}\n\nKeep this link private. Anyone with it can open your plan.\n\nBudget Buddy is an AI advisor run by Kenac Computer Systems. Kenac only sees the lines you choose to share.`;
    const html = `<p>Your ICT plan is saved.</p><p>${escapeHtml(summary)}</p><p><a href="${escapeHtml(links.returnUrl)}">Return to your private plan</a></p><p>${escapeHtml(downloadNote)}</p><p>Keep this link private. Anyone with it can open your plan.</p><p>Budget Buddy is an AI advisor run by Kenac Computer Systems. Kenac only sees the lines you choose to share.</p>`;
    const transport = options.transport ?? nodemailer.createTransport({
      host: smtp.data!.SMTP_HOST, port: smtp.data!.SMTP_PORT,
      secure: smtp.data!.SMTP_PORT === 465,
      ...(smtp.data!.SMTP_USER ? { auth: { user: smtp.data!.SMTP_USER, pass: smtp.data!.SMTP_PASS! } } : {}),
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    });
    const result = await transport.sendMail({
      from: smtp.success ? smtp.data.MAIL_FROM : "plan@example.test",
      to: contact.email, subject: "Your 2027 ICT plan", text, html, attachments,
      disableFileAccess: true, disableUrlAccess: true,
    });
    const rejected = result && typeof result === "object" && "rejected" in result ? result.rejected : [];
    return { emailed: !(Array.isArray(rejected) && rejected.length > 0), ...links };
  } catch {
    return { emailed: false, ...links };
  }
}
