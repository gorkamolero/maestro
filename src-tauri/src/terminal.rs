use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::sync::Arc;
use tauri::State;
use tauri::async_runtime::Mutex as AsyncMutex;
use portable_pty::{native_pty_system, CommandBuilder, PtySize, PtyPair};

// Terminal session with PTY - using the tauri-terminal pattern
pub struct TerminalSession {
    pub pty_pair: Arc<AsyncMutex<PtyPair>>,
    pub writer: Arc<AsyncMutex<Box<dyn Write + Send>>>,
    pub reader: Arc<AsyncMutex<BufReader<Box<dyn Read + Send>>>>,
    pub shell_spawned: Arc<AsyncMutex<bool>>,
}

pub struct TerminalManager {
    pub sessions: HashMap<String, TerminalSession>,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }
}

pub struct TerminalState {
    pub terminal_manager: Arc<AsyncMutex<TerminalManager>>,
}

/// Create a new terminal session with PTY (without spawning shell yet)
#[tauri::command]
pub async fn create_terminal(state: State<'_, TerminalState>, segment_id: String) -> Result<(), String> {
    println!("create_terminal called: segment_id={}", segment_id);

    let mut manager = state.terminal_manager.lock().await;

    // Check if session already exists (React Strict Mode calls effects twice)
    if manager.sessions.contains_key(&segment_id) {
        println!("Terminal session already exists for segment_id={}, reusing", segment_id);
        return Ok(());
    }

    let pty_system = native_pty_system();

    // Create a new PTY
    let pty_pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Get reader and writer for I/O
    let reader = pty_pair.master.try_clone_reader().map_err(|e| format!("Failed to clone reader: {}", e))?;
    let writer = pty_pair.master.take_writer().map_err(|e| format!("Failed to get writer: {}", e))?;

    // Store the session
    let session = TerminalSession {
        pty_pair: Arc::new(AsyncMutex::new(pty_pair)),
        writer: Arc::new(AsyncMutex::new(writer)),
        reader: Arc::new(AsyncMutex::new(BufReader::new(reader))),
        shell_spawned: Arc::new(AsyncMutex::new(false)),
    };

    manager.sessions.insert(segment_id.clone(), session);

    println!("Terminal session created successfully");

    Ok(())
}

/// Spawn a shell in the terminal session
#[tauri::command]
pub async fn create_shell(state: State<'_, TerminalState>, segment_id: String) -> Result<(), String> {
    println!("create_shell called: segment_id={}", segment_id);

    let manager = state.terminal_manager.lock().await;

    if let Some(session) = manager.sessions.get(&segment_id) {
        // Check if shell already spawned (React Strict Mode calls effects twice)
        let mut shell_spawned = session.shell_spawned.lock().await;
        if *shell_spawned {
            println!("Shell already spawned for segment_id={}, skipping", segment_id);
            return Ok(());
        }

        // Determine which shell to use and set TERM env
        let cmd = if cfg!(target_os = "windows") {
            let mut cmd = CommandBuilder::new("powershell.exe");
            cmd.env("TERM", "cygwin");
            cmd
        } else {
            let shell_path = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
            let mut cmd = CommandBuilder::new(shell_path);
            cmd.env("TERM", "xterm-256color");
            cmd
        };

        // Spawn the shell
        let _child = session.pty_pair
            .lock()
            .await
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell: {}", e))?;

        *shell_spawned = true;
        println!("Shell spawned successfully");
        Ok(())
    } else {
        eprintln!("Terminal session not found: {}", segment_id);
        Err("Terminal session not found".to_string())
    }
}

/// Write data to terminal (PTY stdin)
#[tauri::command]
pub async fn terminal_write(state: State<'_, TerminalState>, segment_id: String, data: &str) -> Result<(), String> {
    println!("terminal_write called: segment_id={}, data={:?}", segment_id, data);

    let manager = state.terminal_manager.lock().await;

    if let Some(session) = manager.sessions.get(&segment_id) {
        let mut writer = session.writer.lock().await;
        println!("Writing to PTY...");
        write!(writer, "{}", data).map_err(|e| format!("Failed to write to PTY: {}", e))?;
        println!("Write successful");
        Ok(())
    } else {
        eprintln!("Terminal session not found: {}", segment_id);
        Err("Terminal session not found".to_string())
    }
}

/// Read data from terminal (PTY stdout) - polling pattern
#[tauri::command]
pub async fn terminal_read(state: State<'_, TerminalState>, segment_id: String) -> Result<Option<String>, String> {
    let manager = state.terminal_manager.lock().await;

    if let Some(session) = manager.sessions.get(&segment_id) {
        let mut reader = session.reader.lock().await;

        let data = {
            // Read all available text
            let buf = reader.fill_buf().map_err(|e| format!("Failed to read from PTY: {}", e))?;

            // Send the data to the webview if necessary
            if buf.len() > 0 {
                std::str::from_utf8(buf)
                    .map(|v| Some(v.to_string()))
                    .map_err(|e| format!("Invalid UTF-8: {}", e))?
            } else {
                None
            }
        };

        if let Some(ref data) = data {
            reader.consume(data.len());
        }

        Ok(data)
    } else {
        Err("Terminal session not found".to_string())
    }
}

/// Resize the PTY
#[tauri::command]
pub async fn terminal_resize(state: State<'_, TerminalState>, segment_id: String, rows: u16, cols: u16) -> Result<(), String> {
    let manager = state.terminal_manager.lock().await;

    if let Some(session) = manager.sessions.get(&segment_id) {
        session.pty_pair
            .lock()
            .await
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize PTY: {}", e))?;
        Ok(())
    } else {
        Err("Terminal session not found".to_string())
    }
}

/// Close a terminal session
#[tauri::command]
pub async fn close_terminal(state: State<'_, TerminalState>, segment_id: String) -> Result<(), String> {
    let mut manager = state.terminal_manager.lock().await;
    manager.sessions.remove(&segment_id);
    Ok(())
}
