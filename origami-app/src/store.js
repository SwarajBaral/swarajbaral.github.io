// Tiny external store for playback state, read every frame by the 3D scene
// and subscribed to by the UI.
import { useSyncExternalStore } from 'react';

export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
      subs.forEach((f) => f());
    },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
  };
}

export const player = createStore({ t: 0, playing: false, target: null, speed: 1, hold: 0 });

export function usePlayer(selector = (s) => s) {
  return useSyncExternalStore(player.subscribe, () => selector(player.get()));
}

export function stepIndexAt(steps, t) {
  const i = steps.findIndex((s) => t < s.end - 1e-4);
  return i < 0 ? steps.length : i;
}
