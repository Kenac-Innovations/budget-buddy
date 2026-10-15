/**
 * Advice is category-only (decision D6): the advisor may not introduce vendor or product names
 * into plan items. A name the user said first is allowed (their own context). Enforced in code
 * because a prompt rule alone proved unreliable in live evals.
 */
export const BRAND_NAMES = [
  "Microsoft", "Cisco", "Fortinet", "Dell", "HP", "HPE", "Hewlett Packard", "Lenovo", "Sophos",
  "CrowdStrike", "VMware", "Starlink", "Broadcom", "Oracle", "Amazon", "AWS", "Google", "Azure",
  "Huawei", "Juniper", "Palo Alto", "Veeam", "Nutanix", "Windows", "Copilot", "ChatGPT",
  "Salesforce", "SAP", "Apple", "IBM", "Red Hat", "Check Point", "Veritas", "BeyondTrust", "Meraki",
  "FortiGate", "ThinkPad", "Latitude", "EliteBook", "PowerEdge", "Office 365", "Microsoft 365",
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = BRAND_NAMES.map((name) => ({ name, re: new RegExp(`\\b${escape(name)}\\b`, "i") }));

/** Returns the first brand in `texts` that no user message mentioned, or null. */
export function unpromptedBrand(texts: readonly (string | undefined)[], userMessages: readonly string[]): string | null {
  const said = userMessages.join("\n");
  for (const { name, re } of patterns) {
    if (texts.some((t) => t && re.test(t)) && !re.test(said)) return name;
  }
  return null;
}
