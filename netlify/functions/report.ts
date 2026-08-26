import type { Config } from "@netlify/functions";
import { createPdf, fetchCnpj, type CnpjOverrides, type HubInput } from "../../server/cnpj";

export default async (request: Request) => {
  if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405 });
  try {
    const body = await request.json() as { cnpjs?: string[]; overrides?: CnpjOverrides; hubs?: HubInput[] };
    const cnpjs = Array.isArray(body.cnpjs) ? body.cnpjs : [];
    const results = [];
    if (cnpjs.length > 5) return Response.json({ error: "A API Pública permite no máximo cinco consultas por minuto." }, { status: 429 });
    if (Array.isArray(body.hubs) && body.hubs.length > 10) return Response.json({ error: "Informe no máximo dez hubs adicionais." }, { status: 400 });
    for (const cnpj of cnpjs) {
      try { results.push(await fetchCnpj(cnpj, body.overrides, body.hubs)); } catch { /* mantém apenas resultados consultados */ }
    }
    if (!results.length) return Response.json({ error: "Nenhum CNPJ válido foi consultado." }, { status: 422 });
    const pdf = createPdf(results);
    const data = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", reject);
    });
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=relatorio-cnpj-${Date.now()}.pdf` } });
  } catch {
    return Response.json({ error: "Não foi possível gerar o relatório." }, { status: 500 });
  }
};

export const config: Config = { path: "/api/report" };
