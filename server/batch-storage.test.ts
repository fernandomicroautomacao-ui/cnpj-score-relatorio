import { describe, expect, it } from "vitest";
import { BATCH_INTERVAL_MS } from "../netlify/functions/batch-worker";
import { createBatchJob, getBatchJob, recordBatchOutcome } from "../netlify/functions/batch-storage";

describe("fila persistente de CNPJ", () => {
  it("cria um lote com snapshot dos hubs e regras atuais", async () => {
    const job = await createBatchJob(["00335018000180"]);
    expect(job.total).toBe(1);
    expect(job.status).toBe("queued");
    expect(job.hubs).toHaveLength(2);
    expect(job.rules.cnaeA).toBeDefined();
  });

  it("registra resultados sem repetir um CNPJ já concluído e encerra o lote", async () => {
    const job = await createBatchJob(["00335018000180", "19131243000197"]);
    await recordBatchOutcome(job.id, 0, { error: { cnpj: job.cnpjs[0], message: "Falha simulada" } });
    await recordBatchOutcome(job.id, 0, { error: { cnpj: job.cnpjs[0], message: "Não deve duplicar" } });
    const done = await recordBatchOutcome(job.id, 1, { error: { cnpj: job.cnpjs[1], message: "Falha simulada" } });
    expect(done.processed).toBe(2);
    expect(done.errors).toHaveLength(2);
    expect(done.status).toBe("completed");
    expect((await getBatchJob(job.id))?.completedAt).toBeTruthy();
  });

  it("mantém o intervalo mínimo solicitado entre consultas", () => {
    expect(BATCH_INTERVAL_MS).toBe(15_000);
  });
});
