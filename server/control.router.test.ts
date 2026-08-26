import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("controlPanel sem senha", () => {
  it("permite consultar a configuração a partir de um caller público", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    const configuration = await caller.controlPanel.list();
    expect(configuration.hubs.length).toBeGreaterThanOrEqual(2);
    expect(configuration.parameters.find(parameter => parameter.key === "cnaeA")).toBeDefined();
  });
});
