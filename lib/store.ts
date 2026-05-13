import { create } from 'zustand';

interface AppState {
  pdfFile: File | null;
  setPdfFile: (file: File | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  pdfFile: null,
  setPdfFile: (file) => set({ pdfFile: file }),
}));
