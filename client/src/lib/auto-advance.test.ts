import { afterEach, describe, expect, it, vi } from "vitest";
import { startAutoAdvanceCountdown } from "./auto-advance";
import { getCnpjGroup } from "./cnpj-input";

describe("startAutoAdvanceCountdown", () => {
  afterEach(() => vi.useRealTimers());

  it("faz a contagem de dois segundos e conclui uma única vez", () => {
    vi.useFakeTimers();
    const ticks: number[] = [];
    const complete = vi.fn();
    startAutoAdvanceCountdown(2, seconds => ticks.push(seconds), complete);

    expect(ticks).toEqual([2]);
    vi.advanceTimersByTime(1_000);
    expect(ticks).toEqual([2, 1]);
    vi.advanceTimersByTime(1_000);
    expect(ticks).toEqual([2, 1, 0]);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("cancela o próximo grupo antes da conclusão", () => {
    vi.useFakeTimers();
    const complete = vi.fn();
    const cancel = startAutoAdvanceCountdown(2, () => undefined, complete);

    vi.advanceTimersByTime(1_000);
    cancel();
    vi.advanceTimersByTime(5_000);

    expect(complete).not.toHaveBeenCalled();
  });

  it("encadeia o segundo grupo após dois segundos e preserva a ordem da lista", () => {
    vi.useFakeTimers();
    const cnpjs = Array.from({ length: 6 }, (_, index) => String(index).padStart(14, "0"));
    const startedGroups: string[][] = [];

    const startGroup = (offset: number) => {
      const group = getCnpjGroup(cnpjs, offset);
      startedGroups.push(group);
      const nextOffset = offset + group.length;
      if (nextOffset < cnpjs.length) startAutoAdvanceCountdown(2, () => undefined, () => startGroup(nextOffset));
    };

    startGroup(0);
    expect(startedGroups).toEqual([cnpjs.slice(0, 5)]);
    vi.advanceTimersByTime(2_000);
    expect(startedGroups).toEqual([cnpjs.slice(0, 5), cnpjs.slice(5)]);
  });
});
