//! Jobbrev — Tauri-backend.
//!
//! Rust-sidan håller bara API-nyckeln. Den sparas i macOS Keychain så att den
//! aldrig hamnar i klartext på disk, och hämtas till frontend vid start eftersom
//! Gemini-anropen strömmas direkt från webviewen.

use keyring::v1::Entry;

const SERVICE: &str = "jobbrev";
const ACCOUNT: &str = "gemini-api-key";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT).map_err(|e| format!("Kunde inte nå Nyckelhanteraren: {e}"))
}

#[tauri::command]
fn save_api_key(key: String) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("API-nyckeln är tom.".into());
    }
    entry()?
        .set_password(key)
        .map_err(|e| format!("Kunde inte spara nyckeln: {e}"))
}

/// `Ok(None)` betyder att ingen nyckel är sparad ännu — inte ett fel.
#[tauri::command]
fn get_api_key() -> Result<Option<String>, String> {
    match entry()?.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Kunde inte läsa nyckeln: {e}")),
    }
}

#[tauri::command]
fn delete_api_key() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Kunde inte ta bort nyckeln: {e}")),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            save_api_key,
            get_api_key,
            delete_api_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
