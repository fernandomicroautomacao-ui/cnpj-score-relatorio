import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("controlPanel authorization", () => {
  it("rejects a hub mutation from a caller without administrator role", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
    await expect(caller.controlPanel.createHub({ name: "Hub Bloqueado", city: "Campinas", state: "SP", ddd: "19", latitude: -22.9, longitude: -47.0, minimumScore: 8 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
