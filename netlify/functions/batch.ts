import type { Config } from "@netlify/functions";
import { AsyncWorkloadsClient } from "@netlify/async-workloads";
import { isValidCnpj, onlyDigits } from "../../server/cnpj";
import { createBatchJob, getBatchJob } from "./batch-storage";

const MAX_BATCH_SIZE = 500;

export default async (request: Request) => {
  try {
    const url = new URL(request.url);
    if (request.method === "GET") {
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error:"Informe o identificador do lote." }, { status:400 });
      const job = await getBatchJob(id);
      return job ? Response.json(job) : Response.json({ error:"Lote não encontrado." }, { status:404 });
    }
    if (request.method !== "POST") return Response.json({ error:"Método não permitido." }, { status:405 });
    const body = await request.json() as { cnpjs?: string[] };
    const cnpjs = Array.isArray(body.cnpjs) ? body.cnpjs.map(value => onlyDigits(String(value))).filter(Boolean) : [];
    if (!cnpjs.length) return Response.json({ error:"Informe ao menos um CNPJ." }, { status:400 });
    if (cnpjs.length > MAX_BATCH_SIZE) return Response.json({ error:"O limite é de 500 CNPJs por lote." }, { status:400 });
    const invalid = cnpjs.find(value => !isValidCnpj(value));
    if (invalid) return Response.json({ error:`CNPJ inválido no lote: ${invalid}.` }, { status:400 });
    const job = await createBatchJob(cnpjs);
    const client = new AsyncWorkloadsClient();
    const dispatched = await client.send("cnpj-batch-requested", { data: { batchId:job.id } });
    if (dispatched.sendStatus !== "succeeded") return Response.json({ error:"Não foi possível iniciar o processamento em segundo plano." }, { status:503 });
    return Response.json({ id:job.id, total:job.total, status:job.status }, { status:202 });
  } catch (error) {
    return Response.json({ error:error instanceof Error ? error.message : "Não foi possível preparar o lote." }, { status:500 });
  }
};

export const config: Config = { path:"/api/batch" };
