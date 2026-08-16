import { describe, expect, it, vi } from "vitest";
import { repairChapterState } from "./state-repair";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("repairChapterState", () => {
  it("waits for an accepted background repair to complete", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ status: "running", chapterNumber: 8 }, 202))
      .mockResolvedValueOnce(jsonResponse({ status: "running", chapterNumber: 8 }))
      .mockResolvedValueOnce(jsonResponse({
        status: "completed",
        chapterNumber: 8,
        result: { chapterNumber: 8, status: "ready-for-review" },
      }));

    const result = await repairChapterState({
      bookId: "月落于无心之地",
      chapterNumber: 8,
      fetchImpl,
      wait: vi.fn().mockResolvedValue(undefined),
    });

    expect(result).toMatchObject({ chapterNumber: 8, status: "ready-for-review" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "/api/v1/books/%E6%9C%88%E8%90%BD%E4%BA%8E%E6%97%A0%E5%BF%83%E4%B9%8B%E5%9C%B0/repair-state/8",
    );
  });

  it("surfaces the terminal repair error instead of treating transport acceptance as success", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ status: "running", chapterNumber: 8 }, 202))
      .mockResolvedValueOnce(jsonResponse({
        status: "error",
        chapterNumber: 8,
        error: "State repair still failed for chapter 8.",
      }));

    await expect(repairChapterState({
      bookId: "demo",
      chapterNumber: 8,
      fetchImpl,
      wait: vi.fn().mockResolvedValue(undefined),
    })).rejects.toThrow("State repair still failed for chapter 8.");
  });
});
