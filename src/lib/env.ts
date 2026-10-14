import { z } from "zod";

const optionalText = z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).optional());
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ADVISOR_MODE: z.enum(["demo", "live"]).default("demo"),
  OPENAI_API_KEY: optionalText,
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-6.1"),
  DATABASE_URL: z.preprocess((value) => value === "" ? undefined : value, z.url().refine((value) => /^postgres(ql)?:/.test(value)).optional()),
  APP_URL: z.preprocess((value) => value === "" ? undefined : value, z.url().refine((value) => /^https?:/.test(value)).optional()),
  // Set only when the ingress overwrites this header and direct pod access is blocked.
  TRUSTED_IP_HEADER: z.enum(["x-real-ip", "x-forwarded-for"]).optional(),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === "production" && env.ADVISOR_MODE === "live") {
    for (const key of ["OPENAI_API_KEY", "DATABASE_URL", "APP_URL"] as const) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "Required for production live mode" });
    }
    if (env.APP_URL && !env.APP_URL.startsWith("https://")) {
      ctx.addIssue({ code: "custom", path: ["APP_URL"], message: "Use HTTPS in production live mode" });
    }
  }
});

export function parseEnv(input: Record<string, string | undefined>) {
  const result = schema.safeParse(input);
  // Do not include input values (keys, credentials, connection strings) in errors.
  if (!result.success) throw new Error(`Invalid environment: ${[...new Set(result.error.issues.map((issue) => issue.path.join(".")))].join(", ")}`);
  return result.data;
}

export const env = parseEnv(process.env);
