import { describe, it, expect } from "vitest";
import { parseFeatures, hasFeature, PACKAGE_FEATURES } from "@/lib/feature-gate";

describe("Feature Gating Matrix", () => {
  it("should parse valid JSON features array correctly", () => {
    const raw = JSON.stringify(["menu", "qr", "orders"]);
    const features = parseFeatures(raw);
    expect(features).toEqual(["menu", "qr", "orders"]);
  });

  it("should return empty array for invalid or empty input", () => {
    expect(parseFeatures("")).toEqual([]);
    expect(parseFeatures(null)).toEqual([]);
    expect(parseFeatures("not-json")).toEqual([]);
  });

  it("BASIC package should only allow menu and qr", () => {
    const basicFeatures = PACKAGE_FEATURES.BASIC;
    expect(hasFeature(basicFeatures, "menu")).toBe(true);
    expect(hasFeature(basicFeatures, "qr")).toBe(true);
    expect(hasFeature(basicFeatures, "website")).toBe(false);
    expect(hasFeature(basicFeatures, "orders")).toBe(false);
    expect(hasFeature(basicFeatures, "reviewReward")).toBe(false);
  });

  it("STANDARD package should allow website and orders but lock reviewReward", () => {
    const standardFeatures = PACKAGE_FEATURES.STANDARD;
    expect(hasFeature(standardFeatures, "menu")).toBe(true);
    expect(hasFeature(standardFeatures, "qr")).toBe(true);
    expect(hasFeature(standardFeatures, "website")).toBe(true);
    expect(hasFeature(standardFeatures, "orders")).toBe(true);
    expect(hasFeature(standardFeatures, "reviewReward")).toBe(false);
  });

  it("PREMIUM package should unlock all 5 core features including reviewReward", () => {
    const premiumFeatures = PACKAGE_FEATURES.PREMIUM;
    expect(hasFeature(premiumFeatures, "menu")).toBe(true);
    expect(hasFeature(premiumFeatures, "qr")).toBe(true);
    expect(hasFeature(premiumFeatures, "website")).toBe(true);
    expect(hasFeature(premiumFeatures, "orders")).toBe(true);
    expect(hasFeature(premiumFeatures, "reviewReward")).toBe(true);
  });
});
