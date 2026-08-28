import { useSyncExternalStore } from 'react';
import { store } from './store';
import { GameState } from './types';

/**
 * Subscribe to the whole game state. Re-renders only when state ref changes.
 *
 * The third arg (getServerSnapshot) is required so React can render on the
 * server without a live subscription. Both server and client boot from the
 * same initial state, so the first client paint matches the SSR markup.
 */
export function useGame(): GameState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

/** Convenience: pick a primitive field (stable snapshot). */
export function usePhase(): GameState['phase'] {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().phase,
    () => store.getState().phase
  );
}
