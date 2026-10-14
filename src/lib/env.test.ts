import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("environment validation", () => {
  it("supports demo without external services and a configurable model", () => {
    expect(parseEnv({ ADVISOR_MODE: "demo", OPENAI_MODEL: "deployment-model" }).OPENAI_MODEL).toBe("deployment-model");
    expect(() => parseEnv({ NODE_ENV: "production", ADVISOR_MODE: "demo" })).not.toThrow();
  });
  it("fails production live startup with missing or blank values", () => {
    expect(() => parseEnv({ NODE_ENV: "production", ADVISOR_MODE: "live", OPENAI_API_KEY: "" })).toThrow("OPENAI_API_KEY, DATABASE_URL, APP_URL");
  });
  it("accepts complete live configuration and rejects invalid mode, URL and trust header", () => {
    expect(parseEnv({ NODE_ENV: "production", ADVISOR_MODE: "live", OPENAI_API_KEY: "test", DATABASE_URL: "postgresql://localhost/db", APP_URL: "https://example.org" }).ADVISOR_MODE).toBe("live");
    for (const input of [{ ADVISOR_MODE: "typo" }, { DATABASE_URL: "secret@invalid" }, { TRUSTED_IP_HEADER: "cookie" }]) expect(() => parseEnv(input)).toThrow();
    expect(() => parseEnv({ NODE_ENV: "production", ADVISOR_MODE: "live", OPENAI_API_KEY: "secret", DATABASE_URL: "postgresql://localhost/db", APP_URL: "http://example.org" })).toThrow("APP_URL");
  });
  it("does not echo secret values in validation errors", () => {
    expect(() => parseEnv({ DATABASE_URL: "secret@invalid" })).toThrow(/^Invalid environment: DATABASE_URL$/);
  });
});
