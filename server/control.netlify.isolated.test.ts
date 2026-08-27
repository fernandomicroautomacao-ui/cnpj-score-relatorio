import { describe, expect, it } from "vitest";
import control from "../netlify/functions/control";
import { getPublishedControlConfiguration } from "../netlify/functions/control-storage";

describe("persistência publicada do painel", () => {
  it("salva uma penalidade em peso real sem depender do banco externo", async () => {
    const response = await control(new Request("https://example.test/api/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "updateParameter", key: "cnaeA", value: -5 }),
    }));
    expect(response.status).toBe(200);
    const configuration = await getPublishedControlConfiguration();
    expect(configuration.parameters.find(parameter => parameter.key === "cnaeA")?.value).toBe(-5);
  });
});
