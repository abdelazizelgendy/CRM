import { describe, expect, it } from "vitest";
import { hashInvitationToken, isPasswordAcceptable, normalizeEmail } from "./security";

describe("security helpers", () => {
  it("normalizes emails consistently", () => expect(normalizeEmail(" Owner@Example.COM ")).toBe("owner@example.com"));
  it("rejects short or single-class passwords", () => {
    expect(isPasswordAcceptable("12345678")).toBe(false);
    expect(isPasswordAcceptable("secure123")).toBe(true);
  });
  it("hashes invitation tokens without preserving plaintext", () => {
    const token = "a-secure-random-token-with-enough-length";
    const hash = hashInvitationToken(token);
    expect(hash).toHaveLength(64); expect(hash).not.toContain(token);
  });
  it("rejects unsafe invitation tokens", () => expect(() => hashInvitationToken("short")).toThrow());
});
