# Budget Buddy: The CTO's Journey to a 2027 Budget

13 October 2026. This brings together the product spec, `spec-review.md`, `decisions.md`, the UX lessons (UX Peak via @codevibes_1) and the product discussions held so far. Where it conflicts with the spec, this document wins.

## The idea in one paragraph

An ICT leader (CTO, CIO or CSO) has to **create** their organisation's 2027 ICT budget and get it approved. Budget Buddy is a **tech-expert buddy** they talk to. It starts from what the business needs, advises on what's worth doing (and what's hype) in Zimbabwe in 2027, and turns the agreed plan into a priced budget and a board-ready case. The budget is the **result** of the conversation, not the place it starts. Kenac runs Budget Buddy and says so. Its advice is independent of any vendor. Kenac's catalogue only comes in when something already agreed needs sourcing.

---

## Who is on the journey

| Who | Role in the journey | What they want |
|---|---|---|
| **CIO** | Leads; owns business alignment | A plan the board backs, tied to business goals |
| **CTO** | Leads; owns architecture and platforms | Sensible technical choices, fewer surprises, no gaps |
| **CSO** | Leads a security budget, or contributes to the ICT one | Risk reduced where it matters, without exposing the defences |
| Team member | Contributor (MVP role: editor) | To add quantities and quotes without rebuilding the budget |
| Finance / Exco | Reviewer (MVP role: viewer) | Clear totals, evidence, trade-offs, open questions |
| **Kenac account manager** | Brings the CTO in; may sit in on the first session | A trusted relationship, and later, shared requirements to act on |
| **Kenac engineers** | Write and maintain the trend brief | Their expertise used credibly |

The rest of this document says "CTO" for whichever leader is using it.

## Principles the journey must keep

1. **Start from the CTO's job:** "create my 2027 budget". Not "check" or "audit".
2. **Give before asking.** Useful advice and a draft arrive before any sensitive data or sign-up.
3. **Ask for data only when it's needed** (see the data ladder below).
4. **Peer, not salesperson.** Advice on *what to do* never names a vendor. Kenac-first applies only at sourcing, and only when Kenac's item fits the spec (decision D2).
5. **Kenac is disclosed upfront.** "Run by Kenac. Kenac only sees what you choose to share."
6. **Every price has a source.** AI never invents one (D4). Unknown stays unknown and is shown as such.
7. **The buddy proposes; the CTO accepts.** Every change lands in the plan as a visible draft.
8. **Facts, not pressure.** No countdowns, fake progress or fake urgency.
9. **Private by default. Sharing is asked for last**, after the CTO has their approval pack.
10. **Fits this budget season.** The first session gets them to a usable draft in about 40 minutes.

## The data ladder: what we ask for, and when

| Level | Examples | When it's asked |
|---|---|---|
| 0 · Context | Sector, staff and sites as rough bands, 2027 business goals | First minutes. Nothing sensitive. |
| 1 · Environment | "Branches use LTE and an MPLS link"; key systems by type | Only when an objective needs it |
| 2 · Plans and numbers | Quantities, timing, budget ceiling | When initiatives become budget lines |
| 3 · Commercial detail | Supplier names, quotes, contracts, last year's file | Only to price lines; always optional, line by line |

Vendor names in security lines are never required ("Endpoint protection renewal" is enough). An import of last year's spreadsheet is a **shortcut at level 2–3**, offered once the CTO trusts the tool, never as step 1. When used, the file is read in the browser and nothing is uploaded until they save. They choose which lines come in.

---

## The screen

**The conversation is on the left. The living plan is on the right**, built with Humaflow components.

The plan has three views that fill up as the conversation goes on:
- **Objectives:** the 3–4 business goals, in the CTO's words.
- **Initiatives:** what to do about each, marked Fund / Pilot / Investigate / Defer, with options and sources.
- **Budget:** the priced lines, with evidence labels (Contract, Quote, Kenac price list, Published price, Past spend, Own estimate, Unpriced) and completeness.

Anything the buddy proposes appears in the plan as a draft with **Accept / Edit / Not now**. On a phone, the plan opens as a sheet, for reviewing and accepting while away from the desk.

---

## The journey

### Stage 0: The invitation

| | |
|---|---|
| **Trigger** | The Kenac account manager sends a **personal link** (pilot: email or WhatsApp) to a CTO they already know. |
| **Message** | "Start your 2027 ICT plan with a tech advisor who knows the Zimbabwean market. About 40 minutes to a first draft budget." |
| **Option** | The account manager offers to sit in on the first session. For the pilot, this is the recommended way in. |
| **CTO thinks** | "Is this a sales tool? What will it ask me for?" |
| **Must be true** | The landing page answers both in one screen: who runs it (Kenac), what stays private (everything unless they share), where the data lives (Kenac data centre). One button: **"Start my 2027 plan"**. No sign-up form. |

### Stage 1: Opening (about 2 minutes, level 0)

> **Buddy:** I'm Budget Buddy, run by Kenac. I'll help you shape your 2027 ICT plan and turn it into a budget you can defend. Nothing you tell me is shared unless you choose to. To start: roughly how big is the organisation, and what does the business most need from IT next year?

- The buddy asks for **bands**, not exact figures: staff 100–250, 3–5 sites.
- The plan already shows a starter **2027 skeleton** for an organisation of this size and sector: the usual categories, the usual recurring items (unpriced), and local factors (backup power, paying USD subscriptions, transfer taxes).
- **The CTO has received something before giving anything sensitive.** (Lesson: give value first.)

### Stage 2: Objectives (about 8 minutes, level 0–1)

> **CIO:** We're opening four branches and the board wants fewer outages.
> **Buddy:** Is the branch growth fixed for 2027, or could it slip? And when you say outages, is it connectivity, power or systems? Each needs a different fix.

- The buddy probes like a good advisor: what's driving it, how firm it is, how they'll know it worked.
- **Output:** 3–4 objectives in the plan, each with a measure of success ("Branch downtime under 4 hours a month").
- **CSO lens:** the objectives are framed as risks to reduce ("Ransomware recovery within 24 hours").

### Stage 3: Advice (about 15 minutes, level 1)

For each objective, the buddy gives:
- **options**, always including "keep what you have";
- what each one depends on and how much effort it is;
- **what's real and what's hype** for an organisation like theirs, from the **Kenac trend brief** and dated sources;
- a **recommendation with its reason**, and what it's unsure about.

> **Buddy:** SD-WAN makes sense with four new branches. AI copilot licences for all 140 staff don't yet; pilot 15 seats with your heaviest document users and measure time saved. Your outages are mostly power, so solar plus UPS at branches comes before any network upgrade. Sources: Kenac trend brief (Oct 2026); [ZESA load-shedding schedule, dated].

- Vendor names don't appear here. Advice is about **what** to do, not **whose** product.
- **Output:** initiatives in the plan, each linked to an objective and marked **Fund / Pilot / Investigate / Defer**. The CTO accepts, edits or sets each one aside, and the buddy remembers why.
- **The CTO can push back.** The buddy gives way to their context ("We already have a generator contract") and updates the plan.

### Stage 4: From plan to budget lines (about 10 minutes, level 2)

- Each accepted initiative becomes line items, **including the costs people forget**: implementation, migration, delivery, training, support, and disposal of old equipment.
- The buddy asks only for what each line needs: quantity, timing, the confirmed scope. *"Owning 140 devices doesn't mean replacing 140. How many are due?"*
- Recurring commitments are proposed with renewal months. **This is where last year's spreadsheet is offered as a shortcut** ("Want to bring in last year's lines instead of typing them? It's read on your computer; you choose what comes in.").
- **End of session 1:** a structured 2027 draft. Some lines are priced, many are not, and the plan says so plainly: *"Planned spend so far US$68,285 · 6 lines unpriced · not counted"*.
- **Sign-up happens here**, when they choose to **save the draft**. By now it's *their* plan, so leaving would mean abandoning it, not skipping a form. Progress shows the real steps done: "3 of 6 · Objectives, initiatives, first lines".

### Stage 5: Pricing (over days 1–10, level 3)

| Path | What happens |
|---|---|
| **Kenac price list** | Offered first **only if Kenac's item meets the requirement**. Labelled "Kenac Computer Systems, which runs Budget Buddy". Other options are always available, and always shown to public bodies. |
| **Quote** | The buddy drafts a request for quotation from the agreed spec. The CTO sends it themselves. The reply is attached to the line. |
| **Published price** | A dated public source. Flagged as stale after 90 days. |
| **Own estimate** | Allowed, labelled with the person's name, shown in amber. |
| **Unknown** | Stays unpriced. The total is marked as a floor. |

- **Team members** are invited to fill in their parts (editor role), without rebuilding the budget.
- The buddy follows up with facts, not pressure: *"Two quotes are still outstanding; the firewall renewal is due in August."*

### Stage 6: Trade-offs (session 2, about 15 minutes)

> **Buddy:** You're US$18k over the ceiling. Two options: phase the branch rollout into Q3, or pilot copilot at 8 seats instead of 15. Phasing saves more but delays branch three, which supports objective 1.

- **Each cut shows its saving and its consequence before it's applied.** (Lesson: show what a choice costs.)
- Contracts and items other lines depend on are protected. The buddy won't suggest cutting a prerequisite.
- **Scenarios stay separate** until the CTO applies one.

### Stage 7: The board case (session 3)

- **Approval pack:**
  - the Excel budget, monthly cash profile included;
  - a PDF summary that tells the story: **objective → initiative → spend → what happens if it's deferred**;
  - an evidence register;
  - the assumptions and exchange rates used;
  - open questions.
- Both files come from **the same saved version**, so the figures can't drift apart.
- If Finance has its own template, the export fills that format (to confirm with the pilot organisations).
- The CTO shares the pack with Finance and Exco as **viewers** and records **Approved** once it's signed off.

### Stage 8: Sharing with Kenac (optional, asked last)

> **Buddy:** Your plan is approved. Would you like Kenac to prepare stock and pricing for any of these items? You choose the lines and exactly what Kenac sees.

- Per line: **Private** or **Shared with Kenac**. The CTO sees a preview of exactly what Kenac would receive.
- **The budget amount stays hidden unless they tick it.** Showing a supplier your ceiling weakens your negotiating position.
- They can withdraw at any time. Security lines can stay private permanently.
- Kenac receives the shared lines (a spreadsheet during the pilot, a console later) and follows up through the account manager.

### Stage 9: Through 2027 (after the pilot)

- Quotes replace estimates, items are marked purchased or delayed, and the buddy notices anything that has slipped.
- Quarterly check-ins: "Branch two is live. Is downtime under target?"
- **The 2028 plan starts from this one**, so the CTO never faces a blank page again.

---

## Where it could go wrong, and the answer

| Situation | The journey's answer |
|---|---|
| The CTO is short of time | The account manager-assisted first session. Stages 1–4 can pause and resume at any point. |
| The CTO already has a 2027 draft | "Bring your draft in" (read in the browser). The buddy reviews it against the objectives and lists what's missing. |
| The CSO won't share security detail | Vague line names, permanent privacy, no vendor names required. |
| A public body must get competing quotes | Alternatives are always shown; the RFQ is ready to send to several suppliers. |
| The buddy doesn't know | It says so, marks the item "Investigate", and suggests who or what to ask. |
| The CTO disagrees with advice | Their context wins. The plan records the decision and its reason, for the board story. |
| The CTO suspects a sales tool | Disclosure on screen; vendor-neutral advice; a visible log of anyone who accessed their data; nothing shared without the preview. |
| Research is unavailable | The plan is kept. The buddy says that research is down, works from the trend brief, and offers to retry. |

## Moments that decide the pilot

1. **The first reply.** If the buddy sounds like a chatbot or a salesperson, the CTO leaves. It has to sound like a sharp peer who knows Zimbabwe.
2. **The first piece of advice that changes their mind.** For example, "fix power before the network". That's when it earns trust.
3. **Saving the draft.** That's sign-up, and it happens only after they have something worth keeping.
4. **The board pack.** That's what they came for, and what they'll tell other CTOs about.

## What we measure at each stage

| Stage | Signal |
|---|---|
| 0 → 1 | Invitations opened, and how many sessions start |
| 1 → 4 | Share of starters who save a draft; time to first draft |
| 3 | Advice accepted vs rejected, and the reasons |
| 5 | % of spend backed by quote-or-better evidence |
| 7 | Approval packs exported; budgets recorded as approved |
| 8 | Lines shared with Kenac, and with which fields |
| Quality | Price or source errors, complaints about Kenac bias, calculation mismatches (target: zero) |

---

## What it takes to build

**Already built:** the calculation engine, the sourced-price rules, Kenac-first matching with the fit check, the database schema, Humaflow styling, and a Budget view with sample data.

**For this season's pilot (about 4 weeks):**

| Week | Build |
|---|---|
| 1 | Conversation and plan screen; stages 1–2 (opening, objectives); invite links; saving the draft |
| 2 | Stage 3 advice from the **Kenac trend brief** (needs Kenac engineers this week); stage 4 initiatives into budget lines |
| 3 | Stage 5 pricing: Kenac price list matching, attaching quotes, RFQ draft, in-browser import of last year's file |
| 4 | Stage 6 trade-offs (one reduced scenario); stage 7 Excel + PDF pack; stage 8 sharing consent + Kenac spreadsheet; pilot |

**After the pilot:** open web research, the Kenac operator console, check-ins through the year, multi-stage approvals.

## Open questions

1. **The Kenac trend brief:** who writes the first 10–15 topics this week?
2. **The Kenac price list:** where does it live, and in what format?
3. **Pilot organisations:** 2–3 CTOs starting their 2027 budget now, ideally one public body and one CSO.
4. **AI provider:** the conversation sends what the CTO types to the model. Using the Claude API means it leaves the data centre (D5). Objectives and plans are lower sensitivity than budgets, but this must be stated on screen and recorded under the data protection law.
5. **Login:** a magic link in the personal invitation, a Kenac sign-in, or a password.
6. **Finance templates:** does the pack need to fill each organisation's own Finance format?
