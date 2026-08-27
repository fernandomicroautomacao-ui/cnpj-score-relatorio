import { getStore } from "@netlify/blobs";
import type { CnpjResult, HubInput, RuntimeRules } from "../../server/cnpj";
import { getPublishedControlConfiguration } from "./control-storage";

const STORE_NAME = "cnpj-score-batches";
const KEY_PREFIX = "batch:";
const localBatches = new Map<string, BatchJob>();

export type BatchError = { cnpj: string; message: string };
export type BatchJob = {
  id: string;
  status: "queued" | "running" | "completed";
  cnpjs: string[];
  total: number;
  processed: number;
  completedIndexes: number[];
  results: CnpjResult[];
  errors: BatchError[];
  hubs: HubInput[];
  rules: RuntimeRules;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  nextConsultationAt?: string;
};

function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function key(id: string) { return `${KEY_PREFIX}${id}`; }
async function readFromStore(id: string): Promise<BatchJob | null> {
  try {
    const store = getStore(STORE_NAME);
    const job = await store.get(key(id), { type: "json", consistency: "strong" }) as BatchJob | null;
    return job ? copy(job) : null;
  } catch { return null; }
}
async function writeToStore(job: BatchJob) {
  localBatches.set(job.id, copy(job));
  try { await getStore(STORE_NAME).setJSON(key(job.id), job); } catch { /* fallback usado somente fora do Netlify */ }
}
export async function getBatchJob(id: string) {
  return await readFromStore(id) ?? localBatches.get(id) ?? null;
}
export async function createBatchJob(cnpjs: string[]) {
  const configuration = await getPublishedControlConfiguration();
  const id = crypto.randomUUID();
  const job: BatchJob = {
    id, status: "queued", cnpjs, total: cnpjs.length, processed: 0, completedIndexes: [], results: [], errors: [],
    hubs: configuration.hubs.map(hub => ({ nome:hub.name, cidade:hub.city, uf:hub.state, ddd:hub.ddd ?? undefined, lat:hub.latitude, lon:hub.longitude, minimumScore:hub.minimumScore })),
    rules: Object.fromEntries(configuration.parameters.map(parameter => [parameter.key, parameter.value])) as RuntimeRules,
    createdAt: new Date().toISOString(),
  };
  await writeToStore(job);
  return job;
}
export async function markBatchRunning(id: string) {
  const job = await getBatchJob(id);
  if (!job) throw new Error("Lote não encontrado.");
  if (job.status === "completed") return job;
  job.status = "running";
  job.startedAt ??= new Date().toISOString();
  await writeToStore(job);
  return job;
}
export async function recordBatchOutcome(id: string, index: number, outcome: { result?: CnpjResult; error?: BatchError }) {
  const job = await getBatchJob(id);
  if (!job) throw new Error("Lote não encontrado.");
  if (job.completedIndexes.includes(index)) return job;
  job.completedIndexes.push(index);
  job.processed = job.completedIndexes.length;
  if (outcome.result) job.results.push(outcome.result);
  if (outcome.error) job.errors.push(outcome.error);
  job.nextConsultationAt = job.processed < job.total ? new Date(Date.now() + 15_000).toISOString() : undefined;
  if (job.processed >= job.total) {
    job.status = "completed";
    job.completedAt = new Date().toISOString();
    job.nextConsultationAt = undefined;
  }
  await writeToStore(job);
  return job;
}
