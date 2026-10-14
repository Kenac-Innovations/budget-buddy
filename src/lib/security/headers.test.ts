import { expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./headers";
it("hardens HTTP and never allows arbitrary inline scripts", () => {
  const policy = contentSecurityPolicy("test-nonce");
  expect(policy.split(";").find((part) => part.trim().startsWith("script-src"))).toBe(" script-src 'self' 'nonce-test-nonce'");
  expect(policy).not.toContain("unsafe-eval");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("font-src 'self'");
  expect(securityHeaders.map(({ key }) => key)).toEqual(expect.arrayContaining(["Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options"]));
});
