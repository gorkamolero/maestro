use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::window_state::SavedState;

/// Launch configuration for a favorite
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchConfig {
    pub file_path: Option<String>,
    pub deep_link: Option<String>,
    pub launch_method: LaunchMethod,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum LaunchMethod {
    File,
    Deeplink,
    AppOnly,
}

/// A configured launcher within a workspace
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Favorite {
    pub id: String,
    pub workspace_id: String,
    pub connected_app_id: String,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub position: usize,
    pub launch_config: LaunchConfig,
    pub saved_state: Option<SavedState>,
    pub created_at: String,
    pub updated_at: String,
}

impl Favorite {
    pub fn new(
        workspace_id: String,
        connected_app_id: String,
        name: String,
        launch_config: LaunchConfig,
    ) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: Uuid::new_v4().to_string(),
            workspace_id,
            connected_app_id,
            name,
            icon: None,
            color: None,
            position: 0,
            launch_config,
            saved_state: None,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

/// Result of launching a favorite
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchResult {
    pub success: bool,
    pub method: LaunchMethod,
    pub warnings: Vec<LaunchWarning>,
    pub error: Option<LaunchError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchWarning {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchError {
    pub code: String,
    pub message: String,
    pub recoverable: bool,
}
