import type { Config } from "@netlify/functions";
import { fetchCnpj, type CnpjOverrides, type HubInput, type RuntimeRules } from "../../server/cnpj";
import { getControlConfiguration } from "../../server/db";

export default async (request: Request) => {
  if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405 });
  try {
    const body = await request.json() as { cnpjs?: string[]; overrides?: CnpjOverrides; hubs?: HubInput[]; rules?: RuntimeRules };
    const cnpjs = Array.isArray(body.cnpjs) ? body.cnpjs : [];
    if (!cnpjs.length) return Response.json({ error: "Informe ao menos um CNPJ." }, { status: 400 });
    if (cnpjs.length > 5) return Response.json({ error: "A API Pública permite no máximo cinco consultas por minuto." }, { status: 429 });
    if (Array.isArray(body.hubs) && body.hubs.length > 12) return Response.json({ error: "Informe no máximo dez hubs adicionais além dos dois hubs padrão." }, { status: 400 });
    const persisted = await getControlConfiguration();
    const hubs = body.hubs?.length ? body.hubs : persisted.hubs.map(hub => ({ nome:hub.name, cidade:hub.city, uf:hub.state, ddd:hub.ddd ?? undefined, lat:hub.latitude, lon:hub.longitude, minimumScore:hub.minimumScore ?? undefined }));
    const rules = body.rules ?? Object.fromEntries(persisted.parameters.map(parameter => [parameter.key, parameter.value])) as RuntimeRules;
    const results = [];
    const errors = [];
    for (const cnpj of cnpjs) {
      try { results.push(await fetchCnpj(cnpj, body.overrides, hubs, rules)); }
      catch (error) { errors.push({ cnpj, message: error instanceof Error ? error.message : "Falha ao consultar CNPJ." }); }
    }
    return Response.json({ results, errors });
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }
};

export const config: Config = { path: "/api/analyze" };
