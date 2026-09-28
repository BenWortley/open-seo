import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowStep } from "cloudflare:workers";
import { runQueuedCheck } from "./rankCheckPaths";

const mocks = vi.hoisted(() => ({
  fetchResult: vi.fn(),
  insertSnapshots: vi.fn(),
  getSnapshotsForRun: vi.fn(),
  updateRun: vi.fn(),
  setRunErrorIfEmpty: vi.fn(),
}));
vi.mock("@/server/lib/dataforseo", () => ({
  fetchRankCheckTaskResult: mocks.fetchResult,
  MAX_TASKS_PER_POST: 100,
}));
vi.mock(
  "@/server/features/rank-tracking/repositories/RankTrackingRepository",
  () => ({ RankTrackingRepository: mocks }),
);
vi.mock("@/server/workflows/pgStep", () => ({
  pgStep: (
    _step: unknown,
    _name: string,
    _config: unknown,
    fn: () => unknown,
  ) => fn(),
}));

const task = {
  taskId: "task-1",
  keywordId: "kw-1",
  keyword: "alloy wheel repair",
  device: "mobile" as const,
};
function fixture() {
  const rankCheck = vi.fn();
  const rankCheckTaskPost = vi.fn().mockResolvedValue([task]);
  const sleep = vi.fn();
  return {
    rankCheck,
    rankCheckTaskPost,
    sleep,
    // Only the provider methods used by these paths are needed in this fixture.
    ctx: {
      client: {
        serp: { rankCheck, rankCheckTaskPost },
      } as unknown as Parameters<typeof runQueuedCheck>[1]["client"],
      keywords: [{ id: task.keywordId, keyword: task.keyword }],
      devices: "mobile" as const,
      serpDepth: 100,
      domain: "example.com",
      locationCode: 2826,
      languageCode: "en",
      runId: "run-1",
    },
    step: { sleep } as unknown as WorkflowStep,
  };
}

describe("queued-only scheduled checks", () => {
  beforeEach(() => {
    mocks.getSnapshotsForRun.mockResolvedValue([
      { trackingKeywordId: task.keywordId },
    ]);
  });

  it("saves a completed queued result without any instant call", async () => {
    const f = fixture();
    mocks.fetchResult.mockResolvedValue({
      status: "completed",
      result: {
        keywordId: task.keywordId,
        keyword: task.keyword,
        position: 3,
        url: "https://example.com/",
        serpFeatures: [],
      },
    });
    const stats = await runQueuedCheck(f.step, f.ctx, {
      allowLiveFallback: false,
    });
    expect(stats.queueCollected).toBe(1);
    expect(mocks.insertSnapshots).toHaveBeenCalledWith([
      expect.objectContaining({ position: 3, device: "mobile" }),
    ]);
    expect(f.rankCheck).not.toHaveBeenCalled();
    expect(f.sleep).toHaveBeenCalledTimes(1);
  });

  it.each(["pending", "failed"])(
    "never upgrades a %s queued task to an instant call",
    async (status) => {
      const f = fixture();
      mocks.fetchResult.mockResolvedValue({
        status,
        message: "Provider failed",
      });
      const stats = await runQueuedCheck(f.step, f.ctx, {
        allowLiveFallback: false,
      });
      expect(stats.fallbackTasks).toBe(0);
      expect(stats.fallbackChecked).toBe(0);
      expect(f.rankCheck).not.toHaveBeenCalled();
      expect(mocks.setRunErrorIfEmpty).toHaveBeenCalledWith(
        "run-1",
        expect.stringContaining("instant fallback is disabled"),
      );
      expect(f.sleep).toHaveBeenCalledTimes(status === "pending" ? 10 : 1);
    },
  );

  it("collects a slow queued result after the original polling window without resubmitting", async () => {
    const f = fixture();
    for (let i = 0; i < 6; i++) {
      mocks.fetchResult.mockResolvedValueOnce({ status: "pending" });
    }
    mocks.fetchResult.mockResolvedValueOnce({
      status: "completed",
      result: {
        keywordId: task.keywordId,
        keyword: task.keyword,
        position: 3,
        url: "https://example.com/",
        serpFeatures: [],
      },
    });
    const stats = await runQueuedCheck(f.step, f.ctx, {
      allowLiveFallback: false,
    });
    expect(stats.queueCollected).toBe(1);
    expect(f.rankCheckTaskPost).toHaveBeenCalledTimes(1);
    expect(f.rankCheck).not.toHaveBeenCalled();
    expect(f.sleep).toHaveBeenLastCalledWith("wait-6", "5 minutes");
    expect(mocks.setRunErrorIfEmpty).not.toHaveBeenCalled();
  });

  it("does not spend on instant calls after a rejected task submission", async () => {
    const f = fixture();
    f.rankCheckTaskPost.mockRejectedValue(new Error("Provider unavailable"));
    await runQueuedCheck(f.step, f.ctx, { allowLiveFallback: false });
    expect(f.rankCheck).not.toHaveBeenCalled();
    expect(mocks.fetchResult).not.toHaveBeenCalled();
    expect(mocks.setRunErrorIfEmpty).toHaveBeenCalledWith(
      "run-1",
      expect.stringContaining("instant fallback is disabled"),
    );
  });
});
