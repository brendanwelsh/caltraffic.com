interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const FAILURE_THRESHOLD = 3;
const RECOVERY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// In-memory fallback when KV is not available
const memoryState = new Map<string, CircuitState>();

function getDefaultState(): CircuitState {
  return { failures: 0, lastFailure: 0, isOpen: false };
}

export async function getCircuitState(
  kv: KVNamespace | undefined,
  key: string,
): Promise<CircuitState> {
  if (kv) {
    try {
      const raw = await kv.get(`circuit:${key}`);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return memoryState.get(key) ?? getDefaultState();
}

async function saveCircuitState(
  kv: KVNamespace | undefined,
  key: string,
  state: CircuitState,
): Promise<void> {
  memoryState.set(key, state);
  if (kv) {
    try {
      await kv.put(`circuit:${key}`, JSON.stringify(state), { expirationTtl: 600 });
    } catch {}
  }
}

export async function isCircuitOpen(
  kv: KVNamespace | undefined,
  key: string,
): Promise<boolean> {
  const state = await getCircuitState(kv, key);
  if (!state.isOpen) return false;

  // Check if recovery timeout has passed
  if (Date.now() - state.lastFailure > RECOVERY_TIMEOUT_MS) {
    // Half-open: allow one request through
    const halfOpen: CircuitState = { ...state, isOpen: false };
    await saveCircuitState(kv, key, halfOpen);
    return false;
  }

  return true;
}

export async function recordSuccess(
  kv: KVNamespace | undefined,
  key: string,
): Promise<void> {
  await saveCircuitState(kv, key, getDefaultState());
}

export async function recordFailure(
  kv: KVNamespace | undefined,
  key: string,
): Promise<void> {
  const state = await getCircuitState(kv, key);
  const newState: CircuitState = {
    failures: state.failures + 1,
    lastFailure: Date.now(),
    isOpen: state.failures + 1 >= FAILURE_THRESHOLD,
  };
  await saveCircuitState(kv, key, newState);
}
