import { resolveSessionStore } from "@/lib/session";
import type { SessionStore } from "@/lib/session/store";

type Factory = () => SessionStore | Promise<SessionStore>;
const factories = new Map<string, Factory>([["shared", resolveSessionStore], ["memory", resolveSessionStore]]);

/** Legacy memory selection also uses the shared factory, so all routes agree. */
export function registerSessionStore(name: string, factory: Factory): void {
  if (name === "memory") throw new Error("The memory provider is reserved");
  factories.set(name, factory);
}
export async function getSessionStore(): Promise<SessionStore> {
  const factory = factories.get(process.env.SESSION_STORE ?? "shared");
  if (!factory) throw new Error("The configured session store is not registered");
  return factory();
}
