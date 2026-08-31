import { afterEach, describe, expect, test, vi } from "vitest";
import { generateEmbedding } from "../nim";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("generateEmbedding", () => {
  test("returns the embedding on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { data: [{ embedding: [1, 2, 3] }] })),
    );

    await expect(generateEmbedding("hello", "key")).resolves.toEqual([1, 2, 3]);
  });

  test("surfaces a NIM error without re-reading the Response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(429, { error: { message: "rate limit exceeded" } })),
    );

    await expect(generateEmbedding("hello", "key")).rejects.toThrow(
      /NIM embedding error \(429\):.*rate limit exceeded/,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("retries with a nested input_type payload when the API requires it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(400, { error: { message: "input_type is required" } }))
        .mockResolvedValueOnce(jsonResponse(200, { data: [{ embedding: [0.1, 0.2] }] })),
    );

    await expect(generateEmbedding("hello", "key")).resolves.toEqual([0.1, 0.2]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test("throws the retry error body when the input_type retry also fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(jsonResponse(400, { error: { message: "input_type is required" } }))
        .mockResolvedValueOnce(jsonResponse(503, { error: { message: "upstream unavailable" } })),
    );

    await expect(generateEmbedding("hello", "key")).rejects.toThrow(
      /NIM embedding error \(503\):.*upstream unavailable/,
    );
  });
});
