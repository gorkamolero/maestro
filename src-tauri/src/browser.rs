use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{LogicalPosition, LogicalSize, Webview, WebviewBuilder, WebviewUrl, Window};

pub type WebviewMap = Arc<Mutex<HashMap<String, Webview>>>;

#[tauri::command]
pub fn create_browser_webview(
    window: Window,
    label: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    webviews: tauri::State<WebviewMap>,
) -> Result<String, String> {
    let webview_url = if url.starts_with("http://") || url.starts_with("https://") {
        WebviewUrl::External(url.parse().map_err(|e| format!("Invalid URL: {}", e))?)
    } else if url == "about:blank" {
        WebviewUrl::App("about:blank".into())
    } else {
        return Err("Invalid URL scheme".to_string());
    };

    // Check if webview already exists
    {
        let webviews = webviews.lock().map_err(|e| e.to_string())?;
        if webviews.contains_key(&label) {
            return Ok(label); // Already exists, just return the label
        }
    }

    let webview_builder = WebviewBuilder::new(&label, webview_url);

    // CRITICAL: add_child with position doesn't work reliably
    // Add at origin first, then set position
    let webview = window
        .add_child(
            webview_builder,
            LogicalPosition::new(0.0, 0.0),
            LogicalSize::new(width, height),
        )
        .map_err(|e| format!("Failed to create webview: {}", e))?;

    // Small delay to ensure webview is ready
    std::thread::sleep(std::time::Duration::from_millis(10));

    // NOW set the actual position
    webview
        .set_position(LogicalPosition::new(x, y))
        .map_err(|e| format!("Failed to set position: {}", e))?;

    // Store the webview
    let mut webviews = webviews.lock().map_err(|e| e.to_string())?;
    webviews.insert(label.clone(), webview);

    Ok(label)
}

#[tauri::command]
pub fn close_browser_webview(
    label: String,
    webviews: tauri::State<WebviewMap>,
) -> Result<(), String> {
    let mut webviews = webviews.lock().map_err(|e| e.to_string())?;

    if let Some(webview) = webviews.remove(&label) {
        webview.close().map_err(|e| format!("Failed to close webview: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn update_webview_bounds(
    _window: Window,
    label: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    webviews: tauri::State<WebviewMap>,
) -> Result<(), String> {
    let webviews = webviews.lock().map_err(|e| e.to_string())?;

    if let Some(webview) = webviews.get(&label) {
        webview
            .set_position(LogicalPosition::new(x, y))
            .map_err(|e| format!("Failed to set position: {}", e))?;

        webview
            .set_size(LogicalSize::new(width, height))
            .map_err(|e| format!("Failed to set size: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn navigate_webview(
    _window: Window,
    label: String,
    url: String,
    webviews: tauri::State<'_, WebviewMap>,
) -> Result<(), String> {
    // Parse and validate URL
    let parsed_url = url.parse::<url::Url>()
        .map_err(|e| format!("Invalid URL: {}", e))?;

    // Get the webview and navigate it
    let webviews = webviews.lock().map_err(|e| e.to_string())?;

    if let Some(webview) = webviews.get(&label) {
        webview
            .navigate(parsed_url)
            .map_err(|e| format!("Failed to navigate: {}", e))?;
        Ok(())
    } else {
        Err(format!("Webview '{}' not found", label))
    }
}
