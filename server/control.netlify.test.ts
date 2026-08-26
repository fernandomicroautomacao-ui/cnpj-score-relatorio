import { describe, expect, it } from "vitest";
import control, { isValidControlParameter } from "../netlify/functions/control";

describe("função Netlify do painel de controle", () => {
  it("aceita ações do painel sem exigir chave administrativa", async () => {
    const response = await control(new Request("https://example.test/api/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "ação-inválida" }),
    }));
    expect(response.status).toBe(400);
  });

  it("recusa pontuação mínima negativa ao criar ou editar hubs", async () => {
    const response = await control(new Request("https://example.test/api/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "createHub", data: { name: "Hub inválido", city: "Campinas", state: "SP", ddd: "19", latitude: -22.9, longitude: -47, minimumScore: -1 } }),
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("pontuação mínima") });
    const updateResponse = await control(new Request("https://example.test/api/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "updateHub", id: 1, data: { minimumScore: -1 } }),
    }));
    expect(updateResponse.status).toBe(400);
  });

  it("permite penalidades negativas, mas recusa limiares negativos", async () => {
    const thresholdResponse = await control(new Request("https://example.test/api/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "updateParameter", key: "geoProximoKm", value: -1 }),
    }));
    expect(thresholdResponse.status).toBe(400);
    const penaltyResponse = await control(new Request("https://example.test/api/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "updateParameter", key: "peso_teste_inexistente", value: -5 }),
    }));
    expect(penaltyResponse.status).not.toBe(400);
  });

  it("aceita pesos reais negativos e bloqueia todos os limiares negativos", () => {
    expect(isValidControlParameter("cnaeA", -5)).toBe(true);
    expect(isValidControlParameter("situacaoAtiva", -1)).toBe(true);
    ["minimoExterno", "geoProximoKm", "geoSecundarioKm", "capitalGrandeMin", "capitalMediaMin"].forEach(key => {
      expect(isValidControlParameter(key, -1)).toBe(false);
    });
  });
});
