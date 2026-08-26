import type { Config } from "@netlify/functions";
import { createSalesHub, deleteSalesHub, getControlConfiguration, restoreControlDefaults, updateSalesHub, updateScoringParameter } from "../../server/db";

export function isValidControlParameter(key: string, value: number) {
  const minimum = ["geoProximoKm", "geoSecundarioKm", "minimoExterno"].includes(key) ? 1 : ["capitalGrandeMin", "capitalMediaMin"].includes(key) ? 0 : -100;
  return Number.isInteger(value) && value >= minimum && value <= 1_000_000_000;
}

export default async (request: Request) => {
  try {
    if (request.method === "GET") return Response.json(await getControlConfiguration());
    if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405 });
    const controlToken = process.env.CONTROL_PANEL_TOKEN;
    if (!controlToken) return Response.json({ error: "Painel de controle ainda não foi configurado." }, { status: 503 });
    if (request.headers.get("x-control-panel-token") !== controlToken) return Response.json({ error: "Não autorizado para alterar o painel." }, { status: 401 });
    const body = await request.json() as { action?: string; id?: number; data?: Record<string, unknown>; key?: string; value?: number };
    const hubMinimum = Number((body.data as { minimumScore?: unknown } | undefined)?.minimumScore);
    if (["createHub", "updateHub"].includes(body.action ?? "") && (!Number.isInteger(hubMinimum) || hubMinimum < 1 || hubMinimum > 100)) return Response.json({ error:"A pontuação mínima do hub deve estar entre 1 e 100." }, { status:400 });
    if (body.action === "createHub") return Response.json(await createSalesHub(body.data as Parameters<typeof createSalesHub>[0]));
    if (body.action === "updateHub" && body.id) return Response.json(await updateSalesHub(body.id, body.data as Parameters<typeof updateSalesHub>[1]));
    if (body.action === "deleteHub" && body.id) return Response.json(await deleteSalesHub(body.id));
    if (body.action === "updateParameter" && body.key && Number.isInteger(body.value)) { if (!isValidControlParameter(body.key, body.value)) return Response.json({ error:"Valor inválido para este parâmetro." }, { status:400 }); return Response.json(await updateScoringParameter(body.key, body.value)); }
    if (body.action === "restoreDefaults") return Response.json(await restoreControlDefaults());
    return Response.json({ error: "Operação de controle inválida." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar a configuração." }, { status: 500 });
  }
};

export const config: Config = { path: "/api/control" };
