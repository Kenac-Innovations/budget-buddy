import type { Metadata } from "next";
import Link from "next/link";
import { DeletePlan } from "./delete-plan";

export const metadata: Metadata = { title: "How we handle your data · Budget Buddy" };

export default function PrivacyPage() {
  return <main className="mx-auto max-w-2xl space-y-8 px-5 py-10 text-foreground sm:px-8">
    <Link href="/" className="text-sm font-medium underline underline-offset-4">Return to your plan</Link>
    <header className="space-y-3">
      <p className="text-eyebrow text-muted-foreground">Budget Buddy by Kenac</p>
      <h1 className="text-page-title">How we handle your data</h1>
      <p className="text-muted-foreground">Your plan is private. You choose which lines to share and whether Kenac may contact you.</p>
    </header>
    <section className="space-y-3">
      <h2 className="text-card-title">Who runs it</h2>
      <p>Kenac Computer Systems operates Budget Buddy. The production app and database are intended to run in the Kenac data centre. A pilot hosted elsewhere must disclose its hosting location before you use it.</p>
    </section>
    <section className="space-y-3">
      <h2 className="text-card-title">What we keep</h2>
      <p>We keep the conversation and your ICT plan so you can continue. Your browser holds the device session. The server also needs conversation and plan data to generate replies. We ask for your name, work email, organisation and role only when you choose to save.</p>
      <p>You can describe security needs in general terms. Keep passwords, personal records and sensitive system details out of the conversation.</p>
    </section>
    <section className="space-y-3">
      <h2 className="text-card-title">What goes to OpenAI</h2>
      <p>In live mode, conversation text and relevant plan context are sent to OpenAI’s API to generate replies. This processing happens outside the Kenac data centre. Demo mode uses scripted replies and sends nothing to OpenAI.</p>
      <p>API data is not used for model training unless the API customer opts in. Abuse monitoring logs may include prompts and replies and are normally kept for up to 30 days; legal and safety exceptions can extend this. Some API features also retain application state. We do not promise zero retention.</p>
      <a className="underline underline-offset-4" href="https://developers.openai.com/api/docs/guides/your-data">Read OpenAI’s API data controls</a>
    </section>
    <section className="space-y-3">
      <h2 className="text-card-title">What Kenac sees</h2>
      <p>Kenac’s sales view is limited to lines you choose to share. Allocations stay hidden unless you separately choose to include them. Contact details are shared for follow-up only if you tick the optional contact box. Sending your saved plan by email is a separate choice.</p>
      <p>Privileged administrators can technically access the hosted database to operate the service. This is different from sharing with sales. Kenac must restrict and audit that access.</p>
    </section>
    <section className="space-y-3">
      <h2 className="text-card-title">How long we keep it</h2>
      <p>Unsaved sessions are deleted after 30 days without activity. Saved plans are kept until you ask us to delete them. Deleting here removes our active copy; OpenAI’s retention follows its own API terms.</p>
      <DeletePlan />
    </section>
    <section className="space-y-3">
      <h2 className="text-card-title">Your choices and data rights</h2>
      <p>Zimbabwe’s Cyber and Data Protection Act requires fair, lawful processing for specified purposes. Our proposed basis is your consent under section 10 for planning, saving and optional contact. You may withdraw consent or request access, correction or deletion.</p>
      <a className="underline underline-offset-4" href="https://www.potraz.gov.zw/wp-content/uploads/2022/02/Data-Protection-Act-5-of-2021.pdf">Read the Act published by POTRAZ</a>
      <p className="text-sm text-muted-foreground">TODO(legal): Kenac must confirm the legal basis, international transfer safeguards, administrator access rules and backup deletion timetable before launch.</p>
      <p className="break-words">Data contact: <a className="underline underline-offset-4" href="mailto:privacy@kenac.co.zw">privacy@kenac.co.zw</a></p>
      <p className="text-sm text-muted-foreground">TODO(legal): Proposed address. Kenac must confirm this mailbox is monitored before launch.</p>
    </section>
    <footer className="border-t border-border pt-5 text-sm text-muted-foreground">AI advisor run by Kenac · Your plan is private · <Link className="underline underline-offset-4" href="/privacy">How we handle data</Link></footer>
  </main>;
}
