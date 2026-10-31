import { describe, it, expect } from "vitest";
import { computeFileHash } from "@/lib/hash";

describe("Duplicate Screenshot Detection (SHA-256)", () => {
  it("should generate identical hash for identical binary buffers", async () => {
    const buffer1 = Buffer.from("sample-screenshot-payload-test-12345");
    const buffer2 = Buffer.from("sample-screenshot-payload-test-12345");

    const hash1 = await computeFileHash(buffer1);
    const hash2 = await computeFileHash(buffer2);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string length
  });

  it("should generate different hashes for distinct image payloads", async () => {
    const imageA = Buffer.from("google-review-proof-customer-vikram");
    const imageB = Buffer.from("google-review-proof-customer-rohit");

    const hashA = await computeFileHash(imageA);
    const hashB = await computeFileHash(imageB);

    expect(hashA).not.toBe(hashB);
  });
});
