/**
 * BullMQ queue definitions and worker setup.
 * Workers run in the same process for simplicity;
 * extract to a separate worker process for production scale.
 */

import { Queue, Worker, type Job } from "bullmq";
import { redis } from "./cache";
import { logger } from "./logger";
import { processFISession } from "@modules/aa/aa.service";

// ─── Queue ────────────────────────────────────────────────────────────────────

export const dataFetchQueue = new Queue("data-fetch", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

// ─── Job payloads ─────────────────────────────────────────────────────────────

interface FetchFIDataJob {
  consentId: string;
  userId: string;
}

interface ProcessFISessionJob {
  sessionId: string;
  userId: string;
  privateKeyPem: string;
}

type DataFetchJobData = FetchFIDataJob | ProcessFISessionJob;

// ─── Worker ───────────────────────────────────────────────────────────────────

export function startWorker(): Worker {
  const worker = new Worker<DataFetchJobData>(
    "data-fetch",
    async (job: Job<DataFetchJobData>) => {
      logger.info({ jobId: job.id, jobName: job.name }, "Processing job");

      if (job.name === "process-fi-session") {
        const data = job.data as ProcessFISessionJob;
        await processFISession(data.sessionId, data.userId);
      }

      // "fetch-fi-data" job: trigger a new session for an active consent
      if (job.name === "fetch-fi-data") {
        const data = job.data as FetchFIDataJob;
        const { triggerDataFetch } = await import("@modules/aa/aa.service");
        await triggerDataFetch({ consentId: data.consentId, userId: data.userId });
      }
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, jobName: job.name }, "Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, jobName: job?.name, err }, "Job failed");
  });

  return worker;
}
