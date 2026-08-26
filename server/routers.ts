import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { createPdf, fetchCnpj } from "./cnpj";
import { createSalesHub, deleteSalesHub, getControlConfiguration, restoreControlDefaults, updateSalesHub, updateScoringParameter } from "./db";

const overridesInput = z.object({
  razaoSocial: z.string().optional(), nomeFantasia: z.string().optional(), situacao: z.string().optional(), capitalSocial: z.number().nullable().optional(),
  cnaePrincipal: z.string().optional(), atividadePrincipal: z.string().optional(), cidade: z.string().optional(), uf: z.string().optional(), endereco: z.string().optional(),
}).partial();
const hubInput = z.object({ nome: z.string().trim().min(2).max(80), cidade: z.string().trim().max(80).optional(), uf: z.string().trim().max(2).optional(), ddd: z.string().regex(/^\d{2}$/).optional(), lat: z.number().min(-34).max(6), lon: z.number().min(-75).max(-28), minimumScore: z.number().int().min(1).max(100).optional() });
const rulesInput = z.object({ situacaoAtiva: z.number().int().min(-100).max(100).optional(), situacaoInativa: z.number().int().min(-100).max(100).optional(), capitalGrande: z.number().int().min(-100).max(100).optional(), capitalMedia: z.number().int().min(-100).max(100).optional(), capitalPequena: z.number().int().min(-100).max(100).optional(), capitalGrandeMin: z.number().int().min(0).max(1_000_000_000).optional(), capitalMediaMin: z.number().int().min(0).max(1_000_000_000).optional(), capitalSemInformacao: z.number().int().min(-100).max(100).optional(), cnaeA: z.number().int().min(-100).max(100).optional(), cnaeB: z.number().int().min(-100).max(100).optional(), cnaeSemClassificacao: z.number().int().min(-100).max(100).optional(), geoProximo: z.number().int().min(-100).max(100).optional(), geoSecundario: z.number().int().min(-100).max(100).optional(), geoDistante: z.number().int().min(-100).max(100).optional(), geoProximoKm: z.number().int().min(1).max(10_000).optional(), geoSecundarioKm: z.number().int().min(1).max(10_000).optional(), dddMesmo: z.number().int().min(-100).max(100).optional(), dddEstado: z.number().int().min(-100).max(100).optional(), dddOutro: z.number().int().min(-100).max(100).optional(), minimoExterno: z.number().int().min(1).max(100).optional() });
const cnpjInput = z.object({ cnpjs: z.array(z.string().min(1)).min(1).max(5, "A API Pública permite no máximo cinco consultas por minuto."), overrides: overridesInput.optional(), hubs: z.array(hubInput).max(12).optional(), rules: rulesInput.optional() });
const storedHubInput = z.object({ name: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(80), state: z.string().trim().length(2), ddd: z.string().regex(/^\d{2}$/).nullable().optional(), latitude: z.number().min(-34).max(6), longitude: z.number().min(-75).max(-28), minimumScore: z.number().int().min(1).max(100).nullable().optional() });

function toAnalysisConfig(config: Awaited<ReturnType<typeof getControlConfiguration>>) {
  return { hubs: config.hubs.map(hub => ({ nome: hub.name, cidade: hub.city, uf: hub.state, ddd: hub.ddd ?? undefined, lat: hub.latitude, lon: hub.longitude, minimumScore: hub.minimumScore ?? undefined })), rules: Object.fromEntries(config.parameters.map(parameter => [parameter.key, parameter.value])) };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  cnpj: router({
    lookup: publicProcedure.input(z.object({ cnpj: z.string().min(1) })).mutation(async ({ input }) => {
      return fetchCnpj(input.cnpj);
    }),
    analyze: publicProcedure.input(cnpjInput).mutation(async ({ input }) => {
      const persisted = toAnalysisConfig(await getControlConfiguration());
      const results = [];
      const errors = [];
      for (const value of input.cnpjs) {
        try {
          results.push(await fetchCnpj(value, input.overrides, input.hubs?.length ? input.hubs : persisted.hubs, input.rules ?? persisted.rules));
        } catch (error) {
          errors.push({ cnpj: value, message: error instanceof Error ? error.message : "Falha ao consultar o CNPJ." });
        }
      }
      return { results, errors };
    }),
    report: publicProcedure.input(cnpjInput).mutation(async ({ input }) => {
      const persisted = toAnalysisConfig(await getControlConfiguration());
      const results = [];
      for (const value of input.cnpjs) {
        try { results.push(await fetchCnpj(value, input.overrides, input.hubs?.length ? input.hubs : persisted.hubs, input.rules ?? persisted.rules)); } catch { /* relatório segue com os CNPJs válidos */ }
      }
      if (!results.length) throw new Error("Nenhum CNPJ válido foi consultado.");
      const chunks: Buffer[] = [];
      const pdf = createPdf(results, { hubs: input.hubs?.length ? input.hubs : persisted.hubs, rules: input.rules ?? persisted.rules });
      return await new Promise<{ filename: string; data: string }>((resolve, reject) => {
        pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
        pdf.on("end", () => resolve({ filename: `relatorio-cnpj-${Date.now()}.pdf`, data: Buffer.concat(chunks).toString("base64") }));
        pdf.on("error", reject);
        pdf.end();
      });
    }),
  }),
  controlPanel: router({
    list: publicProcedure.query(() => getControlConfiguration()),
    createHub: adminProcedure.input(storedHubInput).mutation(({ input }) => createSalesHub({ ...input, state: input.state.toUpperCase() })),
    updateHub: adminProcedure.input(z.object({ id: z.number().int().positive(), data: storedHubInput.partial() })).mutation(({ input }) => updateSalesHub(input.id, { ...input.data, state: input.data.state?.toUpperCase() })),
    deleteHub: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteSalesHub(input.id)),
    updateParameter: adminProcedure.input(z.object({ key: z.string().min(1).max(64), value: z.number().int().min(-100).max(1_000_000_000) }).superRefine((input, ctx) => { const nonNegative = ["capitalGrandeMin", "capitalMediaMin", "geoProximoKm", "geoSecundarioKm", "minimoExterno"]; if (nonNegative.includes(input.key) && input.value < (input.key === "minimoExterno" || input.key.startsWith("geo") ? 1 : 0)) ctx.addIssue({ code:"custom", path:["value"], message:"Este limiar não aceita valor negativo." }); })).mutation(({ input }) => updateScoringParameter(input.key, input.value)),
    restoreDefaults: adminProcedure.mutation(() => restoreControlDefaults()),
  }),
});

export type AppRouter = typeof appRouter;
