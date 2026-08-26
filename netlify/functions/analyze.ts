import type { Config } from "@netlify/functions";
import { fetchCnpj, type CnpjOverrides } from "../../server/cnpj";

export default async (request: Request) => {
  if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405 });
  try {
    const body = await request.json() as { cnpjs?: string[]; overrides?: CnpjOverrides };
    const cnpjs = Array.isArray(body.cnpjs) ? body.cnpjs.slice(0, 100) : [];
    if (!cnpjs.length) return Response.json({ error: "Informe ao menos um CNPJ." }, { status: 400 });
    const results = [];
    const errors = [];
    for (const cnpj of cnpjs) {
      try { results.push(await fetchCnpj(cnpj, process.env.CNPJA_API_KEY, body.overrides)); }
      catch (error) { errors.push({ cnpj, message: error instanceof Error ? error.message : "Falha ao consultar CNPJ." }); }
    }
    return Response.json({ results, errors });
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
};

export const config: Config = { path: "/api/analyze" };
