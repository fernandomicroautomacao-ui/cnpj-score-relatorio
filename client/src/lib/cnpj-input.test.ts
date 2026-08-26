import { describe, expect, it } from "vitest";
import { canAnalyzeIndividual, maskCnpj, parseCnpjList } from "./cnpj-input";

describe("cnpj input helpers", () => {
  it("masks a CNPJ while typing", () => {
    expect(maskCnpj("00335018000180")).toBe("00.335.018/0001-80");
  });
  it("parses pasted or imported batches and caps them at five", () => {
    expect(parseCnpjList("00.000.000/0001-91\n11.111.111/1111-11, 12.345.678/0001-95")).toEqual(["00000000000191", "11111111111111", "12345678000195"]);
    expect(parseCnpjList(Array.from({ length: 120 }, (_, i) => String(i).padStart(14, "0")).join("\n"))).toHaveLength(5);
  });
  it("blocks individual analysis until the reviewed data is confirmed", () => {
    expect(canAnalyzeIndividual("00.000.000/0001-91", false)).toBe(false);
    expect(canAnalyzeIndividual("00.000.000/0001-91", true)).toBe(true);
    expect(canAnalyzeIndividual("00.000.000/0001", true)).toBe(false);
  });
});
