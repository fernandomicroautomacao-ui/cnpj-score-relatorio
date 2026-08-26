import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createPdf, fetchCnpj } from "./cnpj";

const overridesInput = z.object({
  razaoSocial: z.string().optional(), nomeFantasia: z.string().optional(), situacao: z.string().optional(), capitalSocial: z.number().nullable().optional(),
  cnaePrincipal: z.string().optional(), atividadePrincipal: z.string().optional(), cidade: z.string().optional(), uf: z.string().optional(), endereco: z.string().optional(),
}).partial();
const hubInput = z.object({ nome: z.string().trim().min(2).max(80), cidade: z.string().trim().max(80).optional(), uf: z.string().trim().max(2).optional(), lat: z.number().min(-34).max(6), lon: z.number().min(-75).max(-28) });
const cnpjInput = z.object({ cnpjs: z.array(z.string().min(1)).min(1).max(5, "A API Pública permite no máximo cinco consultas por minuto."), overrides: overridesInput.optional(), hubs: z.array(hubInput).max(10).optional() });

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
      const results = [];
      const errors = [];
      for (const value of input.cnpjs) {
        try {
          results.push(await fetchCnpj(value, input.overrides, input.hubs));
        } catch (error) {
          errors.push({ cnpj: value, message: error instanceof Error ? error.message : "Falha ao consultar o CNPJ." });
        }
      }
      return { results, errors };
    }),
    report: publicProcedure.input(cnpjInput).mutation(async ({ input }) => {
      const results = [];
      for (const value of input.cnpjs) {
        try { results.push(await fetchCnpj(value, input.overrides, input.hubs)); } catch { /* relatório segue com os CNPJs válidos */ }
      }
      if (!results.length) throw new Error("Nenhum CNPJ válido foi consultado.");
      const chunks: Buffer[] = [];
      const pdf = createPdf(results);
      return await new Promise<{ filename: string; data: string }>((resolve, reject) => {
        pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
        pdf.on("end", () => resolve({ filename: `relatorio-cnpj-${Date.now()}.pdf`, data: Buffer.concat(chunks).toString("base64") }));
        pdf.on("error", reject);
      });
    }),
  }),
});

export type AppRouter = typeof appRouter;
