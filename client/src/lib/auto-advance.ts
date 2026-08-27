export function startAutoAdvanceCountdown(delaySeconds: number, onTick: (seconds: number) => void, onComplete: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active = true;

  const tick = (seconds: number) => {
    if (!active) return;
    onTick(seconds);
    if (seconds === 0) {
      onComplete();
      return;
    }
    timer = setTimeout(() => tick(seconds - 1), 1_000);
  };

  tick(Math.max(0, delaySeconds));

  return () => {
    active = false;
    if (timer !== null) clearTimeout(timer);
  };
}
