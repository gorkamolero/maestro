mod monitor;

use monitor::{ProcessMetrics, ResourceMonitor, SegmentResourceMetrics, SystemMetrics};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};
use portable_pty::{native_pty_system, CommandBuilder, PtySize, MasterPty};

// Global state for the resource monitor
struct AppState {
    monitor: Arc<Mutex<ResourceMonitor>>,
}

// Terminal session with PTY
struct TerminalSession {
    pty_master: Box<dyn MasterPty + Send>,
}

struct TerminalManager {
    sessions: HashMap<String, TerminalSession>,
}

impl TerminalManager {
    fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }
}

// Global terminal manager
static TERMINAL_MANAGER: Mutex<Option<TerminalManager>> = Mutex::new(None);

fn get_terminal_manager() -> std::sync::MutexGuard<'static, Option<TerminalManager>> {
    let mut manager = TERMINAL_MANAGER.lock().unwrap();
    if manager.is_none() {
        *manager = Some(TerminalManager::new());
    }
    manager
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

// Terminal Commands

/// Create a new terminal session with PTY
#[tauri::command]
async fn create_terminal(app: AppHandle, segment_id: String) -> Result<(), String> {
    let pty_system = native_pty_system();

    // Create a new PTY
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Determine which shell to use
    let shell = if cfg!(target_os = "windows") {
        CommandBuilder::new("powershell.exe")
    } else {
        // Try to get user's shell from environment, fallback to bash
        let shell_path = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
        CommandBuilder::new(shell_path)
    };

    // Spawn the shell
    let _child = pair
        .slave
        .spawn_command(shell)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    // Get reader for output streaming
    let mut reader = pair.master.try_clone_reader().map_err(|e| format!("Failed to clone reader: {}", e))?;

    // Store the master PTY in the session (for writing and resizing)
    let mut manager = get_terminal_manager();
    if let Some(ref mut manager) = *manager {
        manager.sessions.insert(
            segment_id.clone(),
            TerminalSession { pty_master: pair.master },
        );
    }

    // Spawn a task to read PTY output and emit events
    let segment_id_clone = segment_id.clone();
    let app_clone = app.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    // EOF - shell exited
                    let _ = app_clone.emit(
                        &format!("terminal-exit-{}", segment_id_clone),
                        "Shell process exited",
                    );
                    break;
                }
                Ok(n) => {
                    // Got data from PTY
                    let data = String::from_utf8_lossy(&buf[0..n]).to_string();
                    let _ = app_clone.emit(
                        &format!("terminal-output-{}", segment_id_clone),
                        data,
                    );
                }
                Err(e) => {
                    let _ = app_clone.emit(
                        &format!("terminal-error-{}", segment_id_clone),
                        format!("PTY read error: {}", e),
                    );
                    break;
                }
            }
        }
    });

    Ok(())
}

/// Write data to terminal (PTY stdin)
#[tauri::command]
fn terminal_write(_app: AppHandle, segment_id: String, data: String) -> Result<(), String> {
    let mut manager = get_terminal_manager();
    if let Some(ref mut manager) = *manager {
        if let Some(session) = manager.sessions.get_mut(&segment_id) {
            let mut writer = session.pty_master.take_writer()
                .map_err(|e| format!("Failed to get PTY writer: {}", e))?;
            writer
                .write_all(data.as_bytes())
                .map_err(|e| format!("Failed to write to PTY: {}", e))?;
            writer
                .flush()
                .map_err(|e| format!("Failed to flush PTY: {}", e))?;
            return Ok(());
        }
    }
    Err("Terminal session not found".to_string())
}

/// Resize the PTY
#[tauri::command]
fn terminal_resize(segment_id: String, rows: u16, cols: u16) -> Result<(), String> {
    let mut manager = get_terminal_manager();
    if let Some(ref mut manager) = *manager {
        if let Some(session) = manager.sessions.get_mut(&segment_id) {
            session.pty_master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| format!("Failed to resize PTY: {}", e))?;
            return Ok(());
        }
    }
    Err("Terminal session not found".to_string())
}

/// Close a terminal session
#[tauri::command]
fn close_terminal(segment_id: String) -> Result<(), String> {
    let mut manager = get_terminal_manager();
    if let Some(ref mut manager) = *manager {
        manager.sessions.remove(&segment_id);
    }
    Ok(())
}

/// Get terminal buffer (not really needed with PTY approach, kept for compatibility)
#[tauri::command]
fn get_terminal_buffer(_segment_id: String) -> Result<String, String> {
    Ok(String::new())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let monitor = Arc::new(Mutex::new(ResourceMonitor::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
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
            get_all_processes,
            terminal_write,
            get_terminal_buffer,
            create_terminal,
            close_terminal,
            terminal_resize
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
