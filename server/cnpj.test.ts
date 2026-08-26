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
});
