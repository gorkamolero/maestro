mod monitor;

use monitor::{ProcessMetrics, ResourceMonitor, SegmentResourceMetrics, SystemMetrics};
use std::sync::Arc;
use tauri::{Emitter, State};

// Global state for the application
struct AppState {
    monitor: Arc<std::sync::Mutex<ResourceMonitor>>,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let monitor = Arc::new(std::sync::Mutex::new(ResourceMonitor::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_pty::init())
        .manage(AppState {
            monitor: monitor.clone(),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_system_metrics,
            get_process_metrics,
            track_segment_process,
            untrack_segment,
            get_segment_metrics,
            kill_process,
            get_all_processes
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
