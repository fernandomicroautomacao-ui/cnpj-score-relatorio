import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";

describe("cnpj procedures", () => {
  it("analyzes an individual CNPJ through the router", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ company: { name: "Cliente Teste", equity: 12000000 }, office: { status: { text: "Ativa" }, mainActivity: { id: "2511000", text: "Fabricação industrial" }, address: { city: "Bauru", state: "SP" } } }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const caller = appRouter.createCaller({ user: undefined, req: {} as any, res: {} as any });
    const response = await caller.cnpj.analyze({ cnpjs: ["00.000.000/0001-91"] });
    expect(response.results).toHaveLength(1); expect(response.errors).toHaveLength(0); expect(response.results[0]?.vendedor).toContain("Marília");
    vi.unstubAllGlobals();
  });

  it("processes a batch and creates a PDF payload", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ company: { name: "Lote Teste", equity: 1000000 }, office: { status: { text: "Ativa" }, mainActivity: { id: "4711302", text: "Comércio" }, address: { city: "Ribeirão Preto", state: "SP" } } }), { status: 200 })));
    const caller = appRouter.createCaller({ user: undefined, req: {} as any, res: {} as any });
    const response = await caller.cnpj.analyze({ cnpjs: ["00.000.000/0001-91", "00.000.000/0001-91"] });
    expect(response.results).toHaveLength(2);
    const pdf = await caller.cnpj.report({ cnpjs: ["00.000.000/0001-91"] });
    expect(pdf.filename).toMatch(/\.pdf$/); expect(pdf.data.startsWith("JVBERi0")).toBe(true);
    vi.unstubAllGlobals();
  });
});
