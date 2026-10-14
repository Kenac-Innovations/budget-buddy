# Advisor evals

Run this suite before a release. It tests the frozen NDJSON contract, checks factual boundaries in code and asks an independent LLM to judge twelve synthetic CIO, CTO, CSO and public-sector conversations.

## Run against the advisor

Start the integrated T1 route on port 3207 with `ADVISOR_MODE=demo` and its in-memory session store. In another terminal:

```sh
pnpm eval --mode demo
pnpm eval --mode demo --scenario 6
```

`EVAL_BASE_URL` or `--base-url` selects another HTTP origin. Each scenario has an isolated cookie jar, sends validated `{message}` requests to `POST /api/advisor/turn`, and consumes the stream with the shared `readEvents()`. The static `OPENING_MESSAGE` is advisor turn 0, including in the question/word-count denominator. No session token or message text is printed to the console.

If T1 has not landed, this **HTTP contract fixture** lets you verify the runner without editing application files:

```sh
pnpm exec tsx evals/demo-server.ts
# In another terminal:
pnpm eval --mode demo --base-url http://127.0.0.1:3207
```

The fixture uses `InMemorySessionStore`, the shared `scriptedTurn()` and `encodeEvent()`. It marks responses with `X-Budget-Buddy-Eval-Fixture: true`. It is deliberately the same two-turn UI fixture T1's brief specifies, so it repeats bank advice and cannot establish scenario-specific quality. Stop it with Ctrl-C when finished. It binds only to loopback, port 3207.

Demo users are scripted. Hidden facts are released only after a matching advisor question. Demo does **not** fabricate judge scores or a quality pass. A demo run completes and writes its report, then exits **1** because live judge evidence is absent. This is intentional fail-closed behaviour, not a transport failure.

## Live evaluation

Start T1 with `ADVISOR_MODE=live`, an account-confirmed `OPENAI_MODEL`, `OPENAI_API_KEY` and the in-memory store if Postgres is unavailable. Set the same key for the runner:

```sh
pnpm eval --mode live
pnpm eval --mode live --scenario 3
```

`OPENAI_EVAL_MODEL` defaults to `OPENAI_MODEL`. No model ID is substituted or assumed available. Both models' accounts need Responses API structured-output support. The simulated-user model sees its hidden facts and temperament, but the advisor receives only the next user message. It must exercise the scenario challenges before declaring the goal met. A judge receives the transcript, operations, final plan and every expectation. It returns five integer scores, one-sentence justifications and up to three weak turns. Output is validated by zod; missing expectations, refusals, incomplete results or missing turns fail the scenario.

The client follows the [official structured-output guide](https://developers.openai.com/api/docs/guides/structured-outputs), using `text.format`, strict schemas and `store: false`. Calls have no SDK retries. Three scenarios run concurrently with separate cookie jars, 65-second turn/model deadlines and a 14-minute overall deadline. Expired or failed scenarios remain in the report and fail release; the deadline is a bound, **not proof** that all live scenarios complete within fifteen minutes. T8 must measure a real full run.

The runner stops on `wrap_up`, the persona's reported goal completion or `maxTurns`. If the advisor wraps up before exercising a challenge, the judge must fail the missing expectation. User acceptance and sharing remain user-only operations; the runner never changes plan JSON or accepts proposals for the persona.

## Cost

Demo eval-client cost is US$0. Live input, cached-input and output tokens are accumulated from every user/judge response, even when its output fails validation. Supply your account's decimal rates per million tokens:

```sh
export OPENAI_EVAL_INPUT_USD_PER_MILLION='…'
export OPENAI_EVAL_CACHED_INPUT_USD_PER_MILLION='…'
export OPENAI_EVAL_OUTPUT_USD_PER_MILLION='…'
```

The console and report print eval-client cost using `decimal.js`. Rates are never guessed. With missing rates the cost is labelled unavailable and token counts remain recorded. **Advisor usage is not in the frozen stream contract**, so total live-run cost cannot be measured here. T8 must reconcile the advisor requests with account usage or add a separately approved usage mechanism. Do not interpret the eval-client cost as the full run cost.

## Checks and gate

Build-plan section 1 is enforced exactly:

- Zero invented prices; zero unprompted vendor names in advice.
- Kenac disclosed in each static first message.
- At most one question mark in at least 90% of advisor turns.
- Average of the five judged dimensions at least 4/5 separately for CIO, CTO and CSO. Strong CIO scores cannot conceal weak CSO scores.

T7 additionally blocks unsupported price operations, voice violations, fewer than 90% replies of at most 90 words, failed scenario expectations and broken/incomplete streams. Only a full **live**, non-fixture suite can certify release. A selected scenario is always diagnostic. Exit 0 means full release evidence passed; exit 1 means report generated but gate failed; exit 2 means invalid configuration.

Amounts are normalised with Decimal, including US$, $, USD, ZWG and ZiG, currency suffixes and k/m notation. Allowed amounts must match a user-stated currency amount, a currently documented line price, or a quantity/period total from the shared budget engine. Ordinary numbers and an empty unpriced total are not evidence for a price. Text deltas are reassembled and checked against evidence available at that point in the stream. Later price operations cannot justify earlier guesses. Summaries and plan narrative are checked too. AI `USER_ESTIMATE`, blank references, invalid/future capture dates and expired evidence fail. This verifies recorded evidence, not the authenticity of an external quote; fabricated facts/sources are also part of the judge's credibility and honesty review.

The contract has no journey-stage event. The runner infers stages conservatively: initiative operations are advice; explicit sourcing/cost requests and price operations are budget; `wrap_up` is wrap-up; other turns are advice. Initiative titles, rationales and cautions are always checked for new brands. User-supplied brand exceptions are chronological and use whole-name matching. Kenac disclosure itself is exempt from the brand denylist; inappropriate steering is a scenario/judge failure. T8 should validate stage inference against the final journey and fixtures.

Reports are written to `evals/reports/<UTC timestamp>.md` with restrictive file permissions. They contain synthetic transcripts, judged expectations, hard findings, the worst three turns, stream operations and the final plan. Generated reports are ignored by git by default; the committed fixture report is an explicitly selected demonstration. Do not point evals at real users' sessions.

## Tests

```sh
pnpm exec vitest run --config evals/vitest.config.mts
pnpm test
pnpm exec next typegen # needed in a fresh worktree for the existing LayoutProps type
pnpm typecheck
pnpm lint
```

The eval tests cover passing/failing crafted transcripts for every hard rule, price timing and currency, exact gate boundaries, cookie isolation/rotation, real HTTP fixture runs, wrap-up/goal/max-turn stops, deadlines and stubbed structured model clients. The dedicated config stays inside T7 ownership. **The root Vitest config currently includes only `src/**/*.test.ts`; T8 must add `evals/**/*.test.ts` to the default CI test run or run the dedicated command alongside it.**
