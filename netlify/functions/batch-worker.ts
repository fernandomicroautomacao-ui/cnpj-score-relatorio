import { asyncWorkloadFn, type AsyncWorkloadConfig } from "@netlify/async-workloads";
import { fetchCnpj } from "../../server/cnpj";
import { getBatchJob, markBatchRunning, recordBatchOutcome } from "./batch-storage";

type BatchEvent = { eventName: "cnpj-batch-requested"; eventData: { batchId: string } };
export const BATCH_INTERVAL_MS = 15_000;

export default asyncWorkloadFn<BatchEvent>(async event => {
  const batchId = event.eventData.batchId;
  const initial = await event.step.run(`load-${batchId}`, () => getBatchJob(batchId));
  if (!initial || initial.status === "completed") return;
  await event.step.run(`start-${batchId}`, () => markBatchRunning(batchId));
  for (let index = 0; index < initial.total; index++) {
    const cnpj = initial.cnpjs[index];
    const outcome = await event.step.run(`consult-${batchId}-${index}`, async () => {
      try { return { result: await fetchCnpj(cnpj, {}, initial.hubs, initial.rules) }; }
      catch (error) { return { error:{ cnpj, message:error instanceof Error ? error.message : "Falha ao consultar CNPJ." } }; }
    });
    await event.step.run(`record-${batchId}-${index}`, () => recordBatchOutcome(batchId, index, outcome));
    if (index < initial.total - 1) await event.step.sleep(`wait-15-seconds-${batchId}-${index}`, BATCH_INTERVAL_MS);
  }
});

export const asyncWorkloadConfig: AsyncWorkloadConfig<BatchEvent> = { events:["cnpj-batch-requested"], maxRetries:3 };
