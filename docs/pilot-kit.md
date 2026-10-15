# Budget Buddy pilot kit

A supervised pilot with **three friendly CTOs, CIOs or CSOs** who are building their 2027 ICT budget now. Goal: learn whether a real leader gets a plan worth taking to Finance, and what's missing, before a wider release.

## Who to invite

| | Ideal mix |
|---|---|
| 1 | A **CIO or CTO** at a mid-sized private organisation (100–500 staff, several sites), e.g. finance, insurance or retail |
| 2 | A **CSO or security lead**, to test the privacy posture and the security lens |
| 3 | An **ICT manager at a public entity or parastatal**, to test the PRAZ and competing-quotes path |

Pick people who'll give blunt feedback and are mid-way through 2027 planning. Avoid anyone in an active Kenac sales process, so the feedback isn't coloured.

## Invitation (email or WhatsApp)

> **Subject: Help us test an AI advisor for your 2027 ICT budget**
>
> Hi [name],
>
> We've built Budget Buddy, an AI tech advisor that helps ICT leaders turn next year's business objectives into a plan and a budget they can defend to Finance and the board. It's run by Kenac, and it's built to give independent advice: it never invents prices, and your plan stays private unless you choose to share lines with us.
>
> We're inviting three ICT leaders to try it on their real 2027 planning before anyone else sees it. It takes about 30 minutes, and you keep the plan and the Excel file.
>
> Would you be open to a 30-minute session in the next two weeks? I'll send a private link, and we'd value 15 minutes of feedback afterwards.
>
> [your name], Kenac Computer Systems

## The session

**Before:** send the link: [BETA URL, pending the dev cluster deployment]. Remind them to use a laptop, and that nothing is shared with Kenac unless they choose to.

**During (about 30 minutes, they drive):**
1. Start with what the business needs from IT in 2027, in their own words.
2. Let the advisor ask questions. Answer as much or as little as they like.
3. Accept or set aside the items it proposes in the plan panel.
4. Ask it what something would cost, to see how it handles pricing.
5. When ready, say "let's wrap up", save the plan and download the Excel file.
6. Optional: share one line with Kenac, to test the sharing preview.

**The facilitator** (someone from Kenac, ideally not sales) watches and takes notes, but doesn't help unless they're stuck for more than a minute. Note where they hesitate, what surprises them, and anything they say out loud.

## Feedback (15 minutes, right after)

Score 1–5, then one sentence on why:
1. **Would you take this plan to Finance or the board** with little rework?
2. **Did the advice feel like a credible peer**, or generic?
3. **Did it understand Zimbabwean realities** (power, connectivity, USD subscriptions, procurement)?
4. **Did you trust it?** Kenac's role, the privacy, and how it handled prices.
5. **How did the conversation feel?** Pace, tone, number of questions.

Open questions:
- What did it get wrong, or miss, that you'd have expected?
- What would make you use it again for 2028, or recommend it to a peer?
- Was there anything you weren't comfortable telling it? Why?

## What counts as success

| Measure | Target |
|---|---|
| Leaders who save a plan and download the Excel file | 3 of 3 |
| "Would take to Finance" score | ≥ 4 average |
| "Credible peer" score | ≥ 4 average |
| Invented prices, vendor pushing or privacy concerns raised | 0 |
| Leaders willing to use it again or recommend it | ≥ 2 of 3 |

## Before the first session (blockers)

- [ ] Deploy to the Kenac dev cluster, with a URL that works on mobile data
- [ ] Budget Buddy has its **own OpenAI project key with a spend cap**, separate from Mushandi's
- [ ] Live mode on (`ADVISOR_MODE=live`, `gpt-5.6-terra`)
- [ ] Postgres available (in-memory sessions are lost on restart)
- [ ] SMTP configured, or accept that the plan link is shown on screen instead of emailed
- [ ] The Kenac price list loaded, or accept "price on request" for Kenac items
- [ ] Advisor name confirmed; a Kenac engineer has reviewed the trend brief
- [ ] The privacy page's `TODO(legal)` items confirmed by Kenac
