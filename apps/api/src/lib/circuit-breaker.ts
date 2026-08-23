/**
 * Process-local circuit breaker (explicitly NOT distributed).
 * Opens for 30s after 5 consecutive failures/timeouts.
 */
type BreakerState = 'CLOSED' | 'OPEN';

class CircuitBreaker {
  private state: BreakerState = 'CLOSED';
  private consecutiveFailures = 0;
  private openedAt: number | null = null;

  private readonly failureThreshold = 5;
  private readonly openDurationMs = 30_000;

  getState(): BreakerState {
    if (this.state === 'OPEN' && this.openedAt !== null) {
      if (Date.now() - this.openedAt >= this.openDurationMs) {
        this.state = 'CLOSED';
        this.consecutiveFailures = 0;
        this.openedAt = null;
      }
    }
    return this.state;
  }

  isOpen(): boolean {
    return this.getState() === 'OPEN';
  }

  recordSuccess() {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
    this.openedAt = null;
  }

  recordFailure() {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
  }
}

export const llmCircuitBreaker = new CircuitBreaker();
