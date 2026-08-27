import { describe, expect, it } from "vitest";
import { canAnalyzeIndividual, getCnpjGroup, maskCnpj, parseCnpjList } from "./cnpj-input";

describe("cnpj input helpers", () => {
  it("masks a CNPJ while typing", () => {
    expect(maskCnpj("00335018000180")).toBe("00.335.018/0001-80");
  });
  it("processa listas coladas ou importadas e limita o lote a 500 CNPJs", () => {
    expect(parseCnpjList("00.000.000/0001-91\n11.111.111/1111-11, 12.345.678/0001-95")).toEqual(["00000000000191", "11111111111111", "12345678000195"]);
    const limited = parseCnpjList(Array.from({ length: 520 }, (_, i) => String(i).padStart(14, "0")).join("\n"));
    expect(limited).toHaveLength(500);
    expect(getCnpjGroup(limited, 495)).toHaveLength(5);
    expect(getCnpjGroup(limited, 500)).toEqual([]);
  });
  it("divide a lista em grupos manuais de no máximo cinco CNPJs", () => {
    const values = Array.from({ length: 12 }, (_, i) => String(i).padStart(14, "0"));
    expect(getCnpjGroup(values, 0)).toHaveLength(5);
    expect(getCnpjGroup(values, 5)).toHaveLength(5);
    expect(getCnpjGroup(values, 10)).toHaveLength(2);
  });
  it("blocks individual analysis until the reviewed data is confirmed", () => {
    expect(canAnalyzeIndividual("00.000.000/0001-91", false)).toBe(false);
    expect(canAnalyzeIndividual("00.000.000/0001-91", true)).toBe(true);
    expect(canAnalyzeIndividual("00.000.000/0001", true)).toBe(false);
  });
});
