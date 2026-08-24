/**
 * Developer chaos injection. Reads the x-simulate-failure header
 * on incoming requests and sets process-local flags that job
 * handlers and services check before calling external systems.
 */
export type ChaosMode = 'llm_timeout' | 'calendar_500' | null;

let activeChaosMode: ChaosMode = null;

export function setChaosMode(mode: ChaosMode) {
  activeChaosMode = mode;
}

export function getChaosMode(): ChaosMode {
  return activeChaosMode;
}

export function isChaosActive(mode: Exclude<ChaosMode, null>): boolean {
  return activeChaosMode === mode;
}
