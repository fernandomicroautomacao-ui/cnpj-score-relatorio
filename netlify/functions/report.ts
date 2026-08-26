import type { Config } from "@netlify/functions";
import { createPdf, fetchCnpj, type CnpjOverrides, type HubInput, type RuntimeRules } from "../../server/cnpj";
import { getControlConfiguration } from "../../server/db";

export default async (request: Request) => {
  if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405 });
  try {
    const body = await request.json() as { cnpjs?: string[]; overrides?: CnpjOverrides; hubs?: HubInput[]; rules?: RuntimeRules };
    const cnpjs = Array.isArray(body.cnpjs) ? body.cnpjs : [];
    const results = [];
    if (cnpjs.length > 5) return Response.json({ error: "A API Pública permite no máximo cinco consultas por minuto." }, { status: 429 });
    if (Array.isArray(body.hubs) && body.hubs.length > 12) return Response.json({ error: "Informe no máximo dez hubs adicionais além dos dois hubs padrão." }, { status: 400 });
    const persisted = await getControlConfiguration();
    const hubs = body.hubs?.length ? body.hubs : persisted.hubs.map(hub => ({ nome:hub.name, cidade:hub.city, uf:hub.state, ddd:hub.ddd ?? undefined, lat:hub.latitude, lon:hub.longitude, minimumScore:hub.minimumScore ?? undefined }));
    const rules = body.rules ?? Object.fromEntries(persisted.parameters.map(parameter => [parameter.key, parameter.value])) as RuntimeRules;
    for (const cnpj of cnpjs) {
      try { results.push(await fetchCnpj(cnpj, body.overrides, hubs, rules)); } catch { /* mantém apenas resultados consultados */ }
    }
    if (!results.length) return Response.json({ error: "Nenhum CNPJ válido foi consultado." }, { status: 422 });
    const pdf = createPdf(results, { hubs, rules });
    const data = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", reject);
      pdf.end();
    });
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=relatorio-cnpj-${Date.now()}.pdf` } });
  } catch {
    return Response.json({ error: "Não foi possível gerar o relatório." }, { status: 500 });
  }
};

export const config: Config = { path: "/api/report" };
