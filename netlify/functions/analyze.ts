import type { Config } from "@netlify/functions";
import { fetchCnpj, type CnpjOverrides, type HubInput } from "../../server/cnpj";

export default async (request: Request) => {
  if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405 });
  try {
    const body = await request.json() as { cnpjs?: string[]; overrides?: CnpjOverrides; hubs?: HubInput[] };
    const cnpjs = Array.isArray(body.cnpjs) ? body.cnpjs : [];
    if (!cnpjs.length) return Response.json({ error: "Informe ao menos um CNPJ." }, { status: 400 });
    if (cnpjs.length > 5) return Response.json({ error: "A API Pública permite no máximo cinco consultas por minuto." }, { status: 429 });
    if (Array.isArray(body.hubs) && body.hubs.length > 10) return Response.json({ error: "Informe no máximo dez hubs adicionais." }, { status: 400 });
    const results = [];
    const errors = [];
    for (const cnpj of cnpjs) {
      try { results.push(await fetchCnpj(cnpj, body.overrides, body.hubs)); }
      catch (error) { errors.push({ cnpj, message: error instanceof Error ? error.message : "Falha ao consultar CNPJ." }); }
    }
    return Response.json({ results, errors });
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
};

export const config: Config = { path: "/api/analyze" };
