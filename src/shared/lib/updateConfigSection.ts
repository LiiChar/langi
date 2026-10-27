import type { Config } from "@/shared/commands/bindings";
import { useSettingsStore } from "@/shared/store/SettingsStore";

export function updateConfigSection<K extends keyof Config>(section: K, patch: Partial<Config[K]>) {
  const { config, save } = useSettingsStore.getState();
  if (!config) return;
  void save({ ...config, [section]: { ...config[section], ...patch } });
}
