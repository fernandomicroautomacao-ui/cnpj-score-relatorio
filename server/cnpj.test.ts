import { describe, expect, it } from "vitest";
import { createPdf, isValidCnpj, scoreCompany } from "./cnpj";

describe("CNPJ deterministic scoring", () => {
  it("validates a known valid CNPJ and rejects repeated digits", () => {
    expect(isValidCnpj("00.000.000/0001-91")).toBe(true);
    expect(isValidCnpj("11.111.111/1111-11")).toBe(false);
  });

  it("returns an auditable recommendation using capital, CNAE and distance", () => {
    const result = scoreCompany({
      company: { name: "Empresa Industrial Teste LTDA", equity: 12000000 },
      office: {
        status: { text: "Ativa" },
        mainActivity: { id: "2511000", text: "Fabricação de estruturas de metal" },
        address: { city: "Bauru", state: "SP", street: "Rua Teste", number: "10" },
      },
    }, "00000000000191");
    expect(result.score).toBeGreaterThanOrEqual(8);
    expect(result.vendedor).toBe("Vendedor Externo — Hub Marília");
    expect(result.explicacao).toContain("Capital social / porte inferido");
    expect(result.distanciaMariliaKm).not.toBeNull();
    expect(result.distanciaRibeiraoKm).not.toBeNull();
  });

  it("uses confirmed user edits when recalculating the recommendation", () => {
    const result = scoreCompany({ office: { status: { text: "Ativa" }, address: { city: "Bauru", state: "SP" } } }, "00000000000191", {
      razaoSocial: "Cadastro Corrigido LTDA", cidade: "Ribeirão Preto", capitalSocial: 2_000_000, cnaePrincipal: "2511000", atividadePrincipal: "Fabricação industrial",
    });
    expect(result.razaoSocial).toBe("Cadastro Corrigido LTDA");
    expect(result.cidade).toBe("Ribeirão Preto");
    expect(result.vendedor).toBe("Vendedor Externo — Hub Ribeirão Preto");
  });

  it("calculates both hub distances for São José do Rio Pardo", () => {
    const result = scoreCompany({
      company: { name: "Empresa teste", equity: 2_000_000 },
      office: {
        status: { text: "Ativa" },
        mainActivity: { id: "1113502", text: "Fabricação" },
        address: { city: "São José do Rio Pardo", state: "SP" },
      },
    }, "00000000000191");

    expect(result.distanciaMariliaKm).not.toBeNull();
    expect(result.distanciaRibeiraoKm).not.toBeNull();
    expect(result.hubMaisProximo).toBe("Ribeirão Preto");
    expect(result.distanciaRibeiraoKm).toBeLessThan(result.distanciaMariliaKm!);
  });

  it("compares an additional hub and recommends it when it is the closest", () => {
    const result = scoreCompany({
      company: { name: "Empresa Industrial Teste", equity: 12_000_000 },
      office: {
        status: { text: "Ativa" },
        mainActivity: { id: "2511000", text: "Fabricação industrial" },
        address: { city: "Bauru", state: "SP" },
      },
    }, "00000000000191", {}, [{ nome: "Hub Bauru", cidade: "Bauru", uf: "SP", lat: -22.3246, lon: -49.0871 }]);

    expect(result.distanciasHubs).toHaveLength(3);
    expect(result.distanciasHubs[0]).toMatchObject({ nome: "Hub Bauru", distanciaKm: 0 });
    expect(result.hubMaisProximo).toBe("Hub Bauru");
    expect(result.vendedor).toBe("Vendedor Externo — Hub Bauru");
  });

  it("only routes to hubs whose individual minimum score is met, then chooses the shortest distance", () => {
    const result = scoreCompany({
      company: { name: "Empresa de limiar", equity: 1_000_000 },
      office: { status: { text: "Ativa" }, mainActivity: { id: "2511000", text: "Fabricação industrial" }, address: { city: "Bauru", state: "SP" } },
    }, "00000000000191", {}, [
      { nome: "Hub Próximo", lat: -22.3246, lon: -49.0871, minimumScore: 20 },
      { nome: "Hub Elegível", lat: -22.2139, lon: -49.9458, minimumScore: 5 },
    ]);
    expect(result.score).toBeLessThan(20);
    expect(result.vendedor).toBe("Vendedor Externo — Hub Elegível");
    expect(result.hubMaisProximo).toBe("Hub Elegível");
  });

  it("uses alphabetical name as a stable fallback when eligible hub distances are exactly equal", () => {
    const result = scoreCompany({
      company: { name: "Empresa empate", equity: 1_000_000 },
      office: { status: { text: "Ativa" }, mainActivity: { id: "2511000", text: "Fabricação industrial" }, address: { city: "Bauru", state: "SP" } },
    }, "00000000000191", {}, [
      { nome: "Hub Zebra", lat: -22.3246, lon: -49.0871, minimumScore: 1 },
      { nome: "Hub Alfa", lat: -22.3246, lon: -49.0871, minimumScore: 1 },
    ]);
    expect(result.hubMaisProximo).toBe("Hub Alfa");
    expect(result.vendedor).toBe("Vendedor Externo — Hub Alfa");
  });

  it("applies configured capital and geographic thresholds to the deterministic score", () => {
    const raw = { company: { name: "Empresa calibrada", equity: 2_000_000 }, office: { status: { text: "Ativa" }, mainActivity: { id: "2511000", text: "Fabricação industrial" }, address: { city: "Bauru", state: "SP" } } };
    const standard = scoreCompany(raw, "00000000000191");
    const calibrated = scoreCompany(raw, "00000000000191", {}, [], { capitalGrandeMin: 1_000_000, capitalGrande: 7, geoProximoKm: 1, geoSecundarioKm: 2, geoDistante: 0 });
    expect(calibrated.score).not.toBe(standard.score);
    expect(calibrated.scoreDetalhes.find(detail => detail.criterio === "Capital social / porte inferido")).toMatchObject({ pontos: 7 });
  });

  it("accepts negative configured weights as auditable score penalties", () => {
    const raw = { company: { name: "Empresa com penalidade", equity: 1_000_000 }, office: { status: { text: "Ativa" }, mainActivity: { id: "2511000", text: "Fabricação industrial" }, address: { city: "Bauru", state: "SP" } } };
    const regular = scoreCompany(raw, "00000000000191");
    const penalized = scoreCompany(raw, "00000000000191", {}, [], { cnaeA: -4, dddOutro: -2 });
    expect(penalized.score).toBeLessThan(regular.score);
    expect(penalized.scoreDetalhes.find(detail => detail.criterio === "Aderência por CNAE")).toMatchObject({ pontos: -4 });
  });

  it("adds audit points when the client DDD matches the closest hub", () => {
    const result = scoreCompany({
      company: { name: "Empresa DDD", equity: 1_000_000 },
      office: {
        status: { text: "Ativa" },
        mainActivity: { id: "2511000", text: "Fabricação industrial" },
        address: { city: "Bauru", state: "SP" },
        phones: [{ area: "14", number: "999999999" }],
      },
    }, "00000000000191");

    expect(result.ddd).toBe("14");
    expect(result.scoreDetalhes.find(detail => detail.criterio === "DDD / proximidade telefônica")).toMatchObject({ pontos: 3 });
  });

  it("creates a non-empty PDF after event handlers are attached", async () => {
    const result = scoreCompany({
      company: { name: "Empresa PDF", equity: 1_000_000 },
      office: { status: { text: "Ativa" }, mainActivity: { id: "2511000", text: "Fabricação industrial" }, address: { city: "Bauru", state: "SP" } },
    }, "00000000000191");
    const pdf = createPdf([result], { hubs: [{ nome: "Hub Auditoria", lat: -22.3246, lon: -49.0871, minimumScore: 8 }], rules: { minimoExterno: 8, capitalGrande: 3, capitalMedia: 2, capitalPequena: 1, cnaeA: 3, cnaeB: 2, geoProximo: 3, geoSecundario: 2, geoDistante: 1, dddMesmo: 3, dddEstado: 2, dddOutro: 1 } });
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", reject);
      pdf.end();
    });
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(500);
  });
});
