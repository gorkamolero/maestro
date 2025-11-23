use crate::macos::{self, RunningApp};
use crate::models::{
    ConnectedApp, Favorite, LaunchConfig, LaunchError, LaunchMethod, LaunchResult, LaunchWarning,
    SavedState,
};
use tauri::command;

/// Register a new connected app
#[command]
pub fn register_connected_app(app_path: String) -> Result<ConnectedApp, String> {
    macos::extract_app_info(&app_path).map_err(|e| e.to_string())
}

/// Get all running applications
#[command]
pub fn get_running_apps() -> Vec<RunningApp> {
    macos::get_running_apps()
}

/// Check if a specific app is running
#[command]
pub fn is_app_running(bundle_id: String) -> bool {
    macos::is_app_running(&bundle_id)
}

/// Bring an app to the front
#[command]
pub fn bring_app_to_front(bundle_id: String) -> Result<(), String> {
    macos::bring_app_to_front(&bundle_id).map_err(|e| e.to_string())
}

/// Launch a favorite
/// Note: This is a simplified version. In production, you'd want to:
/// - Load the favorite from a database
/// - Load the connected app from a database
/// - Manage state restoration
#[command]
pub fn launch_favorite_simple(
    app_path: String,
    file_path: Option<String>,
    deep_link: Option<String>,
    restore_state: bool,
) -> Result<LaunchResult, String> {
    let mut warnings = Vec::new();

    // Determine launch method
    let method = if deep_link.is_some() {
        LaunchMethod::Deeplink
    } else if file_path.is_some() {
        LaunchMethod::File
    } else {
        LaunchMethod::AppOnly
    };

    // Attempt to launch
    let result = match method {
        LaunchMethod::Deeplink => {
            if let Some(url) = deep_link {
                macos::open_url(&url)
            } else {
                return Err("No deep link provided".to_string());
            }
        }
        LaunchMethod::File => {
            if let Some(path) = file_path {
                macos::launch_app_with_file(&app_path, &path)
            } else {
                return Err("No file path provided".to_string());
            }
        }
        LaunchMethod::AppOnly => macos::launch_app(&app_path),
    };

    match result {
        Ok(_) => {
            // TODO: State restoration
            if restore_state {
                warnings.push(LaunchWarning {
                    code: "state_not_restored".to_string(),
                    message: "State restoration not yet implemented".to_string(),
                });
            }

            Ok(LaunchResult {
                success: true,
                method,
                warnings,
                error: None,
            })
        }
        Err(e) => {
            let error = LaunchError {
                code: "launch_failed".to_string(),
                message: e.to_string(),
                recoverable: false,
            };

            Ok(LaunchResult {
                success: false,
                method,
                warnings,
                error: Some(error),
            })
        }
    }
}

/// Check accessibility permission
#[command]
pub fn check_accessibility_permission() -> bool {
    macos::check_accessibility_permission()
}

/// Request accessibility permission
#[command]
pub fn request_accessibility_permission() -> bool {
    macos::request_accessibility_permission()
}

/// Capture window state for an app (stub for now)
#[command]
pub fn capture_window_state(bundle_id: String) -> Result<SavedState, String> {
    let windows = macos::capture_app_windows(&bundle_id).map_err(|e| e.to_string())?;

    Ok(SavedState::new(windows, None))
}
