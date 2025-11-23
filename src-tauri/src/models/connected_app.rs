use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Represents a registered application (the "template" for favorites)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectedApp {
    pub id: String,
    pub bundle_id: String,
    pub name: String,
    pub path: String,
    pub icon: String, // Base64 encoded app icon
    pub capabilities: AppCapabilities,
    pub created_at: String, // ISO 8601 timestamp
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppCapabilities {
    pub url_scheme: Option<String>,
    pub applescriptable: bool,
    pub file_associations: Vec<String>,
}

impl ConnectedApp {
    pub fn new(
        bundle_id: String,
        name: String,
        path: String,
        icon: String,
        capabilities: AppCapabilities,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            bundle_id,
            name,
            path,
            icon,
            capabilities,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}
