import { describe, expect, it } from "vitest";
import { unpromptedBrand } from "./brand-guard";

describe("brand guard", () => {
  it("flags a product name the user never mentioned", () => {
    expect(unpromptedBrand(["Upgrade to Windows 11 on branch PCs"], ["We have old PCs"])).toBe("Windows");
  });
  it("allows a name the user said first", () => {
    expect(unpromptedBrand(["Renew the VMware subscription"], ["Our VMware renewal is in March"])).toBeNull();
  });
  it("matches whole words only", () => {
    expect(unpromptedBrand(["Shape the roadmap"], [])).toBeNull();
    expect(unpromptedBrand(["Supported operating system upgrade"], [])).toBeNull();
  });
});
