mod monitor;

use monitor::{ProcessMetrics, ResourceMonitor, SegmentResourceMetrics, SystemMetrics};
use std::sync::Arc;
use std::sync::Mutex;
use std::collections::HashMap;
use tauri::{Emitter, State, WebviewUrl, WebviewBuilder, LogicalPosition, LogicalSize, Webview, Window};

// Global state for the application
struct AppState {
    monitor: Arc<Mutex<ResourceMonitor>>,
    webviews: Arc<Mutex<HashMap<String, Webview>>>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Resource Monitor Commands
#[tauri::command]
fn get_system_metrics(state: State<AppState>) -> Result<SystemMetrics, String> {
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    Ok(monitor.get_system_metrics())
}

#[tauri::command]
fn get_process_metrics(pid: u32, state: State<AppState>) -> Result<Option<ProcessMetrics>, String> {
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    Ok(monitor.get_process_metrics(pid))
}

#[tauri::command]
fn track_segment_process(
    segment_id: String,
    pid: u32,
    state: State<AppState>,
) -> Result<(), String> {
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    monitor.track_segment_process(segment_id, pid);
    Ok(())
}

#[tauri::command]
fn untrack_segment(segment_id: String, state: State<AppState>) -> Result<(), String> {
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    monitor.untrack_segment(&segment_id);
    Ok(())
}

#[tauri::command]
fn get_segment_metrics(
    segment_id: String,
    state: State<AppState>,
) -> Result<Option<SegmentResourceMetrics>, String> {
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    Ok(monitor.get_segment_metrics(&segment_id))
}

#[tauri::command]
fn kill_process(pid: u32, state: State<AppState>) -> Result<(), String> {
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    monitor.kill_process(pid)
}

#[tauri::command]
fn get_all_processes(state: State<AppState>) -> Result<Vec<ProcessMetrics>, String> {
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    Ok(monitor.get_all_processes())
}

// Browser Webview Commands
#[tauri::command]
fn create_browser_webview(
    window: Window,
    label: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    state: State<AppState>,
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
        let webviews = state.webviews.lock().map_err(|e| e.to_string())?;
        if webviews.contains_key(&label) {
            return Ok(label); // Already exists, just return the label
        }
    }

    let webview_builder = WebviewBuilder::new(&label, webview_url)
        .auto_resize();

    let webview = window
        .add_child(
            webview_builder,
            LogicalPosition::new(x, y),
            LogicalSize::new(width, height),
        )
        .map_err(|e| format!("Failed to create webview: {}", e))?;

    // Store the webview
    let mut webviews = state.webviews.lock().map_err(|e| e.to_string())?;
    webviews.insert(label.clone(), webview);

    Ok(label)
}

#[tauri::command]
fn close_browser_webview(label: String, state: State<AppState>) -> Result<(), String> {
    let mut webviews = state.webviews.lock().map_err(|e| e.to_string())?;

    if let Some(webview) = webviews.remove(&label) {
        webview.close().map_err(|e| format!("Failed to close webview: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
fn update_webview_position(
    label: String,
    x: f64,
    y: f64,
    state: State<AppState>,
) -> Result<(), String> {
    let webviews = state.webviews.lock().map_err(|e| e.to_string())?;

    if let Some(webview) = webviews.get(&label) {
        webview
            .set_position(LogicalPosition::new(x, y))
            .map_err(|e| format!("Failed to set position: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
fn update_webview_size(
    label: String,
    width: f64,
    height: f64,
    state: State<AppState>,
) -> Result<(), String> {
    let webviews = state.webviews.lock().map_err(|e| e.to_string())?;

    if let Some(webview) = webviews.get(&label) {
        webview
            .set_size(LogicalSize::new(width, height))
            .map_err(|e| format!("Failed to set size: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn navigate_webview(
    label: String,
    url: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let webviews = state.webviews.lock().map_err(|e| e.to_string())?;

    if let Some(webview) = webviews.get(&label) {
        let webview_url = if url.starts_with("http://") || url.starts_with("https://") {
            url
        } else if url == "about:blank" {
            url
        } else {
            // Assume it's a search query and use Google
            format!("https://www.google.com/search?q={}", urlencoding::encode(&url))
        };

        webview
            .eval(&format!("window.location.href = '{}'", webview_url))
            .map_err(|e| format!("Failed to navigate: {}", e))?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let monitor = Arc::new(std::sync::Mutex::new(ResourceMonitor::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_pty::init())
        .manage(AppState {
            monitor: monitor.clone(),
            webviews: Arc::new(Mutex::new(HashMap::new())),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_system_metrics,
            get_process_metrics,
            track_segment_process,
            untrack_segment,
            get_segment_metrics,
            kill_process,
            get_all_processes,
            create_browser_webview,
            close_browser_webview,
            update_webview_position,
            update_webview_size,
            navigate_webview
        ])
        .setup(move |app| {
            // Start metrics emission thread
            let app_handle = app.handle().clone();
            let monitor_clone = monitor.clone();

            std::thread::spawn(move || loop {
                std::thread::sleep(std::time::Duration::from_secs(1));

                if let Ok(monitor) = monitor_clone.lock() {
                    let metrics = monitor.get_system_metrics();
                    let _ = app_handle.emit("system-metrics", metrics);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
