import { create } from "zustand";
import { commands, type Config } from "@/shared/commands/bindings";

interface SettingsStore {
  config: Config | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  save: (config: Config) => Promise<void>;
}

let saveQueue = Promise.resolve();

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  config: null,
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      const result = await commands.getConfig();
      if (result.status === "error") throw new Error(String(result.error));
      set({ config: result.data, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Не удалось загрузить настройки", loading: false });
    }
  },
  save: async (config) => {
    set({ config, loading: true, error: null });
    saveQueue = saveQueue.catch(() => undefined).then(async () => {
      const result = await commands.updateConfig(config);
      if (result.status === "error") throw new Error(String(result.error));
    });
    try {
      await saveQueue;
      if (get().config === config) set({ loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Не удалось сохранить настройки", loading: false });
    }
  },
}));
