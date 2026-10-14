import { InMemorySessionStore, type SessionStore } from "@/lib/session/store";

type Factory = () => SessionStore | Promise<SessionStore>;
const globalStore = globalThis as typeof globalThis & { budgetBuddyAdvisorMemory?: InMemorySessionStore };
const memory = globalStore.budgetBuddyAdvisorMemory ??= new InMemorySessionStore();
const factories = new Map<string, Factory>([["memory", () => memory]]);

/** T3/T8 registers its shared getSessionStore factory here without touching the agent loop. */
export function registerSessionStore(name: string, factory: Factory): void {
  if (name === "memory") throw new Error("The memory provider is reserved");
  factories.set(name, factory);
}

export async function getSessionStore(): Promise<SessionStore> {
  const provider = process.env.SESSION_STORE ?? "memory";
  const factory = factories.get(provider);
  if (!factory) throw new Error("The configured session store is not registered");
  return factory();
}
