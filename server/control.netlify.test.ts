import { describe, expect, it } from "vitest";
import control from "../netlify/functions/control";

describe("função Netlify do painel de controle", () => {
  it("aceita a chave administrativa configurada antes de processar uma ação", async () => {
    const token = process.env.CONTROL_PANEL_TOKEN;
    expect(token).toBeTruthy();
    const response = await control(new Request("https://example.test/api/control", {
      method: "POST",
      headers: { "content-type": "application/json", "x-control-panel-token": token! },
      body: JSON.stringify({ action: "ação-inválida" }),
    }));
    expect(response.status).toBe(400);
  });

  it("recusa alteração sem a chave administrativa", async () => {
    const response = await control(new Request("https://example.test/api/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "ação-inválida" }),
    }));
    expect(response.status).toBe(401);
  });
});
