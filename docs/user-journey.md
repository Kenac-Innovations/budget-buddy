# Budget Buddy: The CTO's Journey (Beta)

Agreed 13 October 2026. This replaces the earlier version, which had a Kenac account manager in the loop. The platform now handles the whole journey through one conversation.

## The idea

A CTO, CIO or CSO opens a link and is immediately talking to an expert advisor. The advisor helps them turn the business's 2027 goals into a plan and the plan into a budget they can defend. The budget is the **result** of the conversation, not the place it starts.

**How it should feel: like Iron Man's Jarvis.** A calm, very capable assistant that:
- **anticipates:** "Your branch UPS batteries will be four years old by then. Shall I add replacements?"
- **remembers everything** said earlier, and connects it;
- **shows rather than tells:** the plan builds on screen as you talk, like a heads-up display;
- **is brief:** one thought and at most one question per turn; detail goes in the plan;
- **has dry wit, used sparingly**, never at the cost of clarity, and never jokes about money or risk;
- **defers to the CTO:** gives a clear opinion with a reason, then follows the CTO's call.

The name is to be decided. It won't be "Jarvis" (a Marvel trademark); the character is the brief.

## Principles

1. **The conversation is the product, from the first second.** No landing page and no sign-up form. The advisor itself says what it is, who runs it and how privacy works.
2. **Give before asking.** Advice and a draft plan come before any personal or sensitive detail.
3. **Contact details are asked for once, at the end**, when there's a plan worth saving.
4. **Advice is independent of vendors.** Kenac's catalogue appears only when pricing something already agreed, only if the item fits, and always labelled.
5. **Every price has a source** (Kenac price list, quote, published price) or is the CTO's own labelled estimate. Otherwise it's Unpriced. The AI never invents prices.
6. **Private by default.** Sharing with Kenac is per line, previewed, and asked for last.
7. **Facts, not pressure.** No countdowns or fake urgency.

## The screen

- **Left: the conversation.** Text now; push-to-talk voice next; a face later.
- **Right: the living plan**, in three views that fill up as they talk: **Objectives → Initiatives → Budget**. Each proposed item has **Accept / Not now**.
- **A permanent footer:** "AI advisor run by Kenac · Your plan is private · How we handle data". The data note says what is sent to OpenAI.

---

## The journey

### 0. Finding it
A link from Kenac's website, LinkedIn or customer email:
> "Plan your 2027 ICT budget with an AI tech advisor who knows the Zimbabwean market. About 30 minutes to a first draft."

### 1. Opening (0:00)
The link opens straight into the conversation. The advisor's first message is already there:

> Good afternoon. I'm [name], an AI tech advisor run by Kenac Computer Systems. I'll help you shape your 2027 ICT plan and turn it into a budget you can defend. Your plan is private; Kenac only sees what you choose to share.
> Shall we start with the big picture: what does the business most need from IT next year?

- The private session starts with the CTO's first reply. Until it's saved, it's kept on this device.
- When voice is added, a single tap ("Tap to talk") starts the audio. Browsers require that.

### 2. Getting to know them (1–3 minutes)
- **Role:** CIO, CTO or CSO, which sets the lens (business alignment, architecture, or risk).
- **Size and sector, as bands:** staff 100–250, 3–5 sites, financial services.
- **The plan shows a starter 2027 skeleton:** usual categories, typical recurring items (unpriced), and local factors (backup power, paying USD subscriptions, transfer taxes).

### 3. Objectives (5–10 minutes)
> **CIO:** We're opening four branches and the board wants fewer outages.
> **Advisor:** Four branches and fewer outages. Is the branch timing firm for 2027? And are the outages mostly power, connectivity or systems? Each has a rather different fix.

**Result:** 3–4 objectives in the CTO's own words, each with how they'll know it worked.

### 4. Advice (10–15 minutes)
For each objective, the advisor gives:
- options, always including "keep what you have";
- a recommendation with its reason;
- what's hype for an organisation like theirs;
- the sources and their dates.

> Your outages are mostly power, so solar and UPS at the branches come before any network work. SD-WAN is worth investigating once there are four sites. AI copilot licences for everyone: not yet. A 15-seat pilot will tell you more than a sales deck will.

- **It's proactive:** "Your firewall subscription renews in August. I've added it so it doesn't surprise anyone."
- **Output:** initiatives marked **Fund / Pilot / Investigate / Defer** and linked to objectives. The CTO accepts, edits or sets each aside, and the advisor remembers the reasons.

### 5. Budget (5–10 minutes)
- **Initiatives become lines**, including the costs people forget: implementation, training, support, disposal.
- **The advisor asks only what each line needs:** "Owning 140 laptops doesn't mean replacing 140. How many are due?"
- **Prices:**
  - **Kenac price list:** a matching, fitting item, labelled "Kenac";
  - **a quote** the CTO already has;
  - **a published price**, with its date;
  - **the CTO's own estimate**, labelled as theirs;
  - otherwise **Unpriced**.
- The total reads "US$68,285 so far · 4 lines unpriced".

### 6. Wrap-up and saving (2 minutes)
The advisor summarises:
> Here's where we've landed: three objectives, seven initiatives, US$68,285 planned so far, and four lines still to price. Shall I save this and send you the spreadsheet?

**Details are asked for here, once:** name, work email, organisation, role.

Two separate choices:
- ☑ **Email me my plan and the Excel file.** Required to save; includes a private link to come back.
- ☐ **Kenac may contact me about items I choose to share.** Optional, and unticked by default.

**The Excel file:** lines grouped by objective, with evidence labels, unpriced items and open questions. It's ready to take to Finance.

### 7. Sharing with Kenac (optional)
> Would you like Kenac to price any of these items? You choose the lines and exactly what they see.

- Per line, with a preview of what Kenac receives.
- The budget amount is hidden unless they tick it.
- They can withdraw at any time.

### 8. Coming back
The emailed private link reopens the conversation:
> Welcome back. Last time we agreed power comes first. Two lines are still unpriced. Shall we start there?

---

## If they leave early
- **The session stays on this device**, and the advisor picks up where they left off.
- **Unsaved sessions are deleted after 30 days.**
- **Leaving mid-way is fine.** The advisor never pressures them to save; it offers once, at a natural end.

## What we measure

| Moment | Signal |
|---|---|
| Opening | Share of visitors who send a first reply |
| Objectives → advice | Advice accepted vs set aside, with reasons |
| Wrap-up | Share of sessions saved (details given); time to save |
| Sharing | Lines shared with Kenac; "may contact me" opt-ins |
| Quality | Invented facts or prices, complaints about Kenac bias (target: zero) |

## Beta scope

| In the beta | Next |
|---|---|
| Text conversation + living plan | Push-to-talk voice, then the face |
| Device session, saved with details at the end | Accounts, team members |
| Kenac price list (if provided), quotes, estimates, Unpriced | Supplier search, quote requests |
| Excel export + email | PDF board pack, scenarios to fit a ceiling |
| Sharing per line with Kenac | Kenac console, check-ins through the year |

**Model:** OpenAI GPT-6.1 for the advisor, set by `OPENAI_MODEL` (confirm the exact model ID in the OpenAI account).

## Still to decide
- The advisor's name.
- The Kenac price list: source and format (needed for Kenac-labelled prices).
- Who at Kenac reviews the draft trend brief (one hour, after launch is fine).
