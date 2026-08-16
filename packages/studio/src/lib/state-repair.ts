import { fetchJson, invalidateApiPaths } from "../hooks/use-api";

interface ChapterStateRepairResult {
  readonly chapterNumber: number;
  readonly status: string;
}

interface StateRepairJob {
  readonly status: "running" | "completed" | "error";
  readonly chapterNumber: number;
  readonly result?: ChapterStateRepairResult;
  readonly error?: string;
}

interface RepairChapterStateOptions {
  readonly bookId: string;
  readonly chapterNumber: number;
  readonly fetchImpl?: typeof fetch;
  readonly wait?: (milliseconds: number) => Promise<void>;
  readonly pollIntervalMs?: number;
  readonly maxWaitMs?: number;
}

const delay = (milliseconds: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, milliseconds);
});

export async function repairChapterState(
  options: RepairChapterStateOptions,
): Promise<ChapterStateRepairResult> {
  const bookPath = encodeURIComponent(options.bookId);
  const path = `/books/${bookPath}/repair-state/${options.chapterNumber}`;
  const deps = options.fetchImpl ? { fetchImpl: options.fetchImpl } : undefined;
  const wait = options.wait ?? delay;
  const deadline = Date.now() + (options.maxWaitMs ?? 15 * 60_000);
  let job = await fetchJson<StateRepairJob>(path, { method: "POST" }, deps);

  while (job.status === "running" && Date.now() < deadline) {
    await wait(options.pollIntervalMs ?? 2_000);
    job = await fetchJson<StateRepairJob>(path, {}, deps);
  }

  if (job.status === "completed" && job.result) {
    invalidateApiPaths(["/api/v1/books", `/api/v1/books/${bookPath}`]);
    return job.result;
  }
  if (job.status === "error") throw new Error(job.error || "State repair failed.");
  throw new Error(`State repair timed out for chapter ${options.chapterNumber}.`);
}
