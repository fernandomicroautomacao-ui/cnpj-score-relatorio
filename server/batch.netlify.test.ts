import { describe, expect, it, vi } from "vitest";

const send = vi.fn().mockResolvedValue({ sendStatus: "succeeded", eventId: "evt-test" });
vi.mock("@netlify/async-workloads", () => ({ AsyncWorkloadsClient: class { send = send; } }));

import batch from "../netlify/functions/batch";

describe("endpoint de lote publicado", () => {
  it("aceita um lote válido e o envia para execução em segundo plano", async () => {
    const response = await batch(new Request("https://example.test/api/batch", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ cnpjs:["00.000.000/0001-91"] }) }));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ total:1, status:"queued" });
    expect(send).toHaveBeenCalledWith("cnpj-batch-requested", expect.objectContaining({ data:expect.any(Object) }));
  });

  it("recusa lotes acima de 500 CNPJs antes de enfileirar", async () => {
    const response = await batch(new Request("https://example.test/api/batch", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ cnpjs:Array.from({ length:501 }, () => "00335018000180") }) }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error:expect.stringContaining("500") });
  });

  it("exige identificador ao consultar o andamento do lote", async () => {
    const response = await batch(new Request("https://example.test/api/batch"));
    expect(response.status).toBe(400);
  });
});
