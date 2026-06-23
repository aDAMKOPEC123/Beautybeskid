import { create } from 'zustand';

export type ClientPanelTheme = 'client' | 'employee' | 'admin';

interface ClientPanelTransitionState {
  active: boolean;
  label: string;
  subtitle: string;
  theme: ClientPanelTheme;
  start: (payload: {
    label: string;
    subtitle: string;
    theme: ClientPanelTheme;
  }) => void;
  finish: () => void;
}

const initialState = {
  active: false,
  label: '',
  subtitle: '',
  theme: 'client' as ClientPanelTheme,
};

export const useClientPanelTransitionStore = create<ClientPanelTransitionState>((set) => ({
  ...initialState,
  start: ({ label, subtitle, theme }) =>
    set({
      active: true,
      label,
      subtitle,
      theme,
    }),
  finish: () => set(initialState),
}));
