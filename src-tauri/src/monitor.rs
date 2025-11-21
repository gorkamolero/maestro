use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use sysinfo::{Pid, System};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub total_ram: u64, // in MB
    pub used_ram: u64,  // in MB
    pub total_cpu: f32, // percentage
    pub process_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessMetrics {
    pub pid: u32,
    pub name: String,
    pub ram: u64, // in MB
    pub cpu: f32, // percentage
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SegmentResourceMetrics {
    pub segment_id: String,
    pub ram: u64, // in MB
    pub cpu: f32, // percentage
    pub processes: Vec<ProcessMetrics>,
    pub last_updated: String,
}

pub struct ResourceMonitor {
    system: Arc<Mutex<System>>,
    segment_processes: Arc<Mutex<HashMap<String, Vec<u32>>>>, // segment_id -> [pids]
}

impl ResourceMonitor {
    pub fn new() -> Self {
        Self {
            system: Arc::new(Mutex::new(System::new_all())),
            segment_processes: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn get_system_metrics(&self) -> SystemMetrics {
        let mut sys = self.system.lock().unwrap();
        sys.refresh_memory();
        sys.refresh_cpu();
        sys.refresh_processes();

        // Get current process (Maestro app)
        let current_pid = std::process::id();

        let mut app_ram = 0u64;
        let mut app_cpu = 0f32;
        let mut app_process_count = 0usize;

        // Track this process and all child processes
        if let Some(process) = sys.process(Pid::from_u32(current_pid)) {
            app_ram += process.memory() / 1024 / 1024; // Convert to MB
            app_cpu += process.cpu_usage();
            app_process_count += 1;

            // Get all tracked segment processes too
            let segment_processes = self.segment_processes.lock().unwrap();
            for pids in segment_processes.values() {
                for &pid in pids {
                    if let Some(proc) = sys.process(Pid::from_u32(pid)) {
                        app_ram += proc.memory() / 1024 / 1024;
                        app_cpu += proc.cpu_usage();
                        app_process_count += 1;
                    }
                }
            }
        }

        SystemMetrics {
            total_ram: sys.total_memory() / 1024 / 1024, // Total system RAM for reference
            used_ram: app_ram,                           // Only Maestro's RAM usage
            total_cpu: app_cpu,                          // Only Maestro's CPU usage
            process_count: app_process_count,            // Only Maestro's process count
        }
    }

    pub fn get_process_metrics(&self, pid: u32) -> Option<ProcessMetrics> {
        let mut sys = self.system.lock().unwrap();
        sys.refresh_process(Pid::from_u32(pid));

        sys.process(Pid::from_u32(pid)).map(|process| {
            ProcessMetrics {
                pid,
                name: process.name().to_string(),
                ram: process.memory() / 1024 / 1024, // Convert to MB
                cpu: process.cpu_usage(),
            }
        })
    }

    pub fn track_segment_process(&self, segment_id: String, pid: u32) {
        let mut processes = self.segment_processes.lock().unwrap();
        processes
            .entry(segment_id)
            .or_insert_with(Vec::new)
            .push(pid);
    }

    pub fn untrack_segment(&self, segment_id: &str) {
        let mut processes = self.segment_processes.lock().unwrap();
        processes.remove(segment_id);
    }

    pub fn get_segment_metrics(&self, segment_id: &str) -> Option<SegmentResourceMetrics> {
        let processes = self.segment_processes.lock().unwrap();
        let pids = processes.get(segment_id)?;

        let mut total_ram = 0u64;
        let mut total_cpu = 0f32;
        let mut process_metrics = Vec::new();

        for &pid in pids {
            if let Some(metrics) = self.get_process_metrics(pid) {
                total_ram += metrics.ram;
                total_cpu += metrics.cpu;
                process_metrics.push(metrics);
            }
        }

        Some(SegmentResourceMetrics {
            segment_id: segment_id.to_string(),
            ram: total_ram,
            cpu: total_cpu,
            processes: process_metrics,
            last_updated: chrono::Utc::now().to_rfc3339(),
        })
    }

    pub fn kill_process(&self, pid: u32) -> Result<(), String> {
        let sys = self.system.lock().unwrap();
        if let Some(process) = sys.process(Pid::from_u32(pid)) {
            if process.kill() {
                Ok(())
            } else {
                Err(format!("Failed to kill process {}", pid))
            }
        } else {
            Err(format!("Process {} not found", pid))
        }
    }

    pub fn get_all_processes(&self) -> Vec<ProcessMetrics> {
        let mut sys = self.system.lock().unwrap();
        sys.refresh_processes();

        sys.processes()
            .iter()
            .map(|(pid, process)| ProcessMetrics {
                pid: pid.as_u32(),
                name: process.name().to_string(),
                ram: process.memory() / 1024 / 1024, // Convert to MB
                cpu: process.cpu_usage(),
            })
            .collect()
    }
}

impl Default for ResourceMonitor {
    fn default() -> Self {
        Self::new()
    }
}
