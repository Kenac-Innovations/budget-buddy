import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const base = "http://localhost:3205";
const accessToken = "T5_demo_access_token_only_000000000000000000000";
let sessionCookie = "";
async function api(path, body) {
  const response = await fetch(`${base}${path}`, { method: body === undefined ? "GET" : "POST", headers: { ...(body === undefined ? {} : { "Content-Type": "application/json", origin: base }), ...(sessionCookie ? { cookie: sessionCookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const cookie = response.headers.get("set-cookie");
  if (cookie?.startsWith("bb_session=")) sessionCookie = cookie.split(";")[0];
  return response;
}
assert.equal((await api("/api/export/xlsx")).status, 401);
assert.equal((await fetch(`${base}/kenac`)).status, 401);
for (const message of ["We have 180 staff and four new branches next year. We need fewer outages.", "Mostly power. The timing is firm."]) {
  const response = await api(process.env.T5_TURN_PATH ?? "/api/advisor/turn", { message });
  assert.equal(response.status, 200);
  await response.text();
}
let { plan } = await (await api("/api/plan")).json();
for (const item of [...plan.objectives, ...plan.initiatives, ...plan.lines]) {
  assert.equal((await api("/api/plan/op", { op: { op: "set_state", id: item.id, state: "accepted" } })).status, 200);
}
({ plan } = await (await api("/api/plan")).json());
const line = plan.lines[0];
assert.equal((await api("/api/plan/op", { op: { op: "price_line", id: line.id, price: { unitPrice: "12000.00", currency: "USD", evidence: { type: "USER_ESTIMATE", reference: "Synthetic smoke estimate only", capturedAt: "2026-10-14" } } } })).status, 200);
assert.equal((await api("/api/share")).status, 403);
const save = await api("/api/session/save", { name: "Demo CIO", email: "demo@example.test", organisation: "Synthetic private organisation", role: "CIO", consentEmail: true, consentContact: false });
assert.equal(save.status, 200);
const { returnUrl } = await save.json();
const xlsx = await api("/api/export/xlsx");
assert.equal(xlsx.status, 200);
await writeFile("/private/tmp/budget-buddy-T5-review/runtime-export.xlsx", new Uint8Array(await xlsx.arrayBuffer()));
assert.equal((await api("/api/plan/op", { op: { op: "set_sharing", id: line.id, shared: true } })).status, 200);
const confirmed = await api("/api/share", {});
assert.equal(confirmed.status, 200);
const { rows } = await confirmed.json();
assert.equal(rows.length, 1);
assert.equal(rows[0].allocation, undefined);
assert.equal(rows[0].contact, undefined);
const headers = { authorization: `Bearer ${accessToken}` };
const html = await (await fetch(`${base}/kenac`, { headers })).text();
assert(html.includes(line.title));
assert(!html.includes("Synthetic private organisation"));
assert(!html.includes("demo@example.test"));
assert(!html.includes("48000"));
assert(!html.includes(plan.lines[1].title));
assert.equal((await fetch(`${base}/kenac/csv`, { headers })).status, 200);
assert.equal((await api("/api/plan/op", { op: { op: "set_sharing", id: line.id, shared: false } })).status, 200);
assert(!(await (await fetch(`${base}/kenac`, { headers })).text()).includes(line.title));
const login = await fetch(`${base}/kenac/login`, { method: "POST", redirect: "manual", headers: { origin: base }, body: new URLSearchParams({ token: accessToken }) });
assert.equal(login.status, 303);
const cookie = login.headers.get("set-cookie");
assert(cookie.includes("HttpOnly"));
assert(!cookie.includes(accessToken));
assert.equal((await fetch(`${base}/kenac`, { headers: { cookie } })).status, 200);
await writeFile("/private/tmp/budget-buddy-T5-review/browser-return.json", JSON.stringify({ returnUrl }));
console.log("Runtime smoke passed: demo session → accept → price → save → XLSX → preview → protected Kenac HTML/CSV → withdraw → login cookie.");
