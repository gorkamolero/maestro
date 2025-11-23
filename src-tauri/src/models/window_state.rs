use serde::{Deserialize, Serialize};

/// Window state for position and size tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowState {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub display_id: String,
    pub is_minimized: bool,
    pub is_fullscreen: bool,
    pub window_title: String,
    pub window_index: usize,
}

/// Saved state containing window positions and metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedState {
    pub windows: Vec<WindowState>,
    pub captured_at: String, // ISO 8601 timestamp
    pub captured_from_file: Option<String>,
}

impl SavedState {
    pub fn new(windows: Vec<WindowState>, captured_from_file: Option<String>) -> Self {
        Self {
            windows,
            captured_at: chrono::Utc::now().to_rfc3339(),
            captured_from_file,
        }
    }
}
