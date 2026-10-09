import { create } from "zustand";
import { loadSettings, saveSettings } from "@/modules/settings/api/settings-repository";
import { defaultSettingsValues, type SettingsValues } from "@/modules/settings/model/settings.schema";

type SettingsStore = {
  isHydrated: boolean;
  values: SettingsValues;
  hydrate: () => Promise<void>;
  persist: (values: SettingsValues) => Promise<void>;
  persistCloseBehavior: (closeBehavior: SettingsValues["closeBehavior"]) => Promise<void>;
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  isHydrated: false,
  values: defaultSettingsValues,
  hydrate: async () => {
    const loaded = await loadSettings();
    set({
      values: loaded ?? defaultSettingsValues,
      isHydrated: true,
    });
  },
  persist: async (values) => {
    await saveSettings(values);
    set({ values });
  },
  persistCloseBehavior: async (closeBehavior) => {
    const nextValues = {
      ...get().values,
      closeBehavior,
    };
    await saveSettings(nextValues);
    set({ values: nextValues });
  },
}));
