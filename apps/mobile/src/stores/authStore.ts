import { create } from 'zustand';
import type { AccountType } from '@dental/types';

interface AuthState {
  userId: string | null;
  accountType: AccountType | null;
  isOnboarded: boolean;
  setSession: (userId: string | null, accountType: AccountType | null) => void;
  setOnboarded: (value: boolean) => void;
  reset: () => void;
}

/**
 * Client-side mirror of the authenticated session. This is NOT the source of
 * truth for permissions — every server-side operation is still gated by RLS
 * (see docs/03-security.md). This store only drives navigation/UI state
 * (which stack to show, which affordances to render).
 */
export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  accountType: null,
  isOnboarded: false,
  setSession: (userId, accountType) => set({ userId, accountType }),
  setOnboarded: (value) => set({ isOnboarded: value }),
  reset: () => set({ userId: null, accountType: null, isOnboarded: false }),
}));
