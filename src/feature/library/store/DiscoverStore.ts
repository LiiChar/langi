import { create } from "zustand";

interface DiscoverStore {
  providers: string[];
  provider: string;
  query: string;
  setProviders: (providers: string[]) => void;
  setProvider: (provider: string) => void;
  setQuery: (query: string) => void;
}

export const useDiscoverStore = create<DiscoverStore>((set) => ({
  providers: [],
  provider: "",
  query: "",
  setProviders: (providers) => set({ providers }),
  setProvider: (provider) => set({ provider }),
  setQuery: (query) => set({ query }),
}));
