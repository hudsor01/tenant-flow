import { createStore } from "zustand/vanilla";

import type { ThemeMode } from "@repo/shared";

export type PreferencesState = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

export const createPreferencesStore = (init?: Partial<PreferencesState>) =>
  createStore<PreferencesState>()((set) => ({
    themeMode: init?.themeMode ?? "dark",
    setThemeMode: (mode) => set({ themeMode: mode }),
  }));
