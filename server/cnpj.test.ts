import { describe, expect, it } from "vitest";
import { isValidCnpj, scoreCompany } from "./cnpj";

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
});
