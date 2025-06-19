import { create } from 'zustand';

interface LayoutState {
  bottomPlayerHeight: number;
  setBottomPlayerHeight: (height: number) => void;
}

const useLayoutStore = create<LayoutState>((set) => ({
  bottomPlayerHeight: 0,
  setBottomPlayerHeight: (height) => set({ bottomPlayerHeight: height }),
}));

export default useLayoutStore;