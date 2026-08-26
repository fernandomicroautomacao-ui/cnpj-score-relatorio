import type { Config } from "@netlify/functions";
import { fetchCnpj } from "../../server/cnpj";

export default async (request: Request) => {
  if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405 });
  try {
    const body = await request.json() as { cnpj?: string };
    if (!body.cnpj) return Response.json({ error: "Informe o CNPJ." }, { status: 400 });
    return Response.json(await fetchCnpj(body.cnpj, process.env.CNPJA_API_KEY));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao consultar CNPJ." }, { status: 400 });
  }
};

export const config: Config = { path: "/api/lookup" };
