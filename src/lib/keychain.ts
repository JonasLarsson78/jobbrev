import { invoke } from "@tauri-apps/api/core";

/** Nyckeln ligger i macOS Keychain, aldrig i klartext på disk. */
export const keychain = {
  save: (key: string) => invoke<void>("save_api_key", { key }),
  get: () => invoke<string | null>("get_api_key"),
  remove: () => invoke<void>("delete_api_key"),
};
