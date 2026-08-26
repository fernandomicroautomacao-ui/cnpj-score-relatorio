import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateScoringParameter: vi.fn(async (key: string, value: number) => ({ key, value })),
}));

vi.mock("./db", () => ({
  createSalesHub: vi.fn(),
  deleteSalesHub: vi.fn(),
  getControlConfiguration: vi.fn(),
  restoreControlDefaults: vi.fn(),
  updateSalesHub: vi.fn(),
  updateScoringParameter: mocks.updateScoringParameter,
}));

const { default: control } = await import("../netlify/functions/control");

describe("endpoint isolado de parâmetros de score", () => {
  it("aceita uma penalidade em um peso real sem escrever no banco", async () => {
    const response = await control(new Request("https://example.test/api/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "updateParameter", key: "cnaeA", value: -5 }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.updateScoringParameter).toHaveBeenCalledWith("cnaeA", -5);
  });
});
