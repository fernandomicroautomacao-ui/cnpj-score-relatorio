import type { Config } from "@netlify/functions";
import { getPublishedControlConfiguration, mutatePublishedControl } from "./control-storage";

export function isValidControlParameter(key: string, value: number) {
  const minimum = ["geoProximoKm", "geoSecundarioKm", "minimoExterno"].includes(key) ? 1 : ["capitalGrandeMin", "capitalMediaMin"].includes(key) ? 0 : -100;
  return Number.isInteger(value) && value >= minimum && value <= 1_000_000_000;
}

export default async (request: Request) => {
  try {
    if (request.method === "GET") return Response.json(await getPublishedControlConfiguration());
    if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405 });
    const body = await request.json() as { action?: string; id?: number; data?: Record<string, unknown>; key?: string; value?: number };
    if (body.action === "updateParameter" && body.key && Number.isInteger(body.value) && !isValidControlParameter(body.key, body.value)) return Response.json({ error:"Valor inválido para este parâmetro." }, { status:400 });
    return Response.json(await mutatePublishedControl(body.action ?? "", body));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar a configuração." }, { status: 400 });
  }
};

export const config: Config = { path: "/api/control" };
