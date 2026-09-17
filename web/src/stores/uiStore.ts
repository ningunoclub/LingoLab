// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * Chrome visibility, ported from the legacy `navbarVisible` store
 * (frontend/src/lib/stores.svelte.ts). Visible by default; full-bleed routes
 * (editor, play, admin) hide it while mounted.
 */
type UiState = {
  navbarVisible: boolean;
  setNavbarVisible: (visible: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  navbarVisible: true,
  setNavbarVisible: (visible) => set({ navbarVisible: visible }),
}));

/** Hides the navbar while the calling route is mounted, restoring it on unmount. */
export function useHideNavbar(): void {
  useEffect(() => {
    const { setNavbarVisible } = useUiStore.getState();
    setNavbarVisible(false);
    return () => setNavbarVisible(true);
  }, []);
}
