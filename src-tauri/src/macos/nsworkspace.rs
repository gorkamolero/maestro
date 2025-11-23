#[cfg(target_os = "macos")]
use cocoa::appkit::NSWorkspace;
#[cfg(target_os = "macos")]
use cocoa::base::{id, nil};
#[cfg(target_os = "macos")]
use cocoa::foundation::{NSArray, NSAutoreleasePool, NSString, NSURL};
#[cfg(target_os = "macos")]
use objc::{class, msg_send, sel, sel_impl};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunningApp {
    pub bundle_id: String,
    pub name: String,
    pub pid: u32,
}

#[derive(Debug)]
pub enum LaunchError {
    NotFound,
    PermissionDenied,
    Unknown(String),
}

impl std::fmt::Display for LaunchError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotFound => write!(f, "Application not found"),
            Self::PermissionDenied => write!(f, "Permission denied"),
            Self::Unknown(msg) => write!(f, "{}", msg),
        }
    }
}

impl std::error::Error for LaunchError {}

#[cfg(target_os = "macos")]
pub fn launch_app_with_file(app_path: &str, file_path: &str) -> Result<(), LaunchError> {
    unsafe {
        let _pool = NSAutoreleasePool::new(nil);

        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];

        let app_url = NSURL::alloc(nil).initFileURLWithPath_(
            NSString::alloc(nil).init_str(app_path)
        );

        let file_url = NSURL::alloc(nil).initFileURLWithPath_(
            NSString::alloc(nil).init_str(file_path)
        );

        let urls = NSArray::arrayWithObject(nil, file_url);

        // Create configuration
        let config: id = msg_send![class!(NSWorkspaceOpenConfiguration), configuration];

        // Open with completion handler (synchronous for simplicity)
        let success: bool = msg_send![
            workspace,
            openURLs:urls
            withApplicationAtURL:app_url
            configuration:config
            completionHandler:nil
        ];

        if success {
            Ok(())
        } else {
            Err(LaunchError::Unknown("Failed to launch app".to_string()))
        }
    }
}

#[cfg(target_os = "macos")]
pub fn launch_app(app_path: &str) -> Result<(), LaunchError> {
    unsafe {
        let _pool = NSAutoreleasePool::new(nil);

        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];

        let app_url = NSURL::alloc(nil).initFileURLWithPath_(
            NSString::alloc(nil).init_str(app_path)
        );

        let config: id = msg_send![class!(NSWorkspaceOpenConfiguration), configuration];

        let success: bool = msg_send![
            workspace,
            openApplicationAtURL:app_url
            configuration:config
            completionHandler:nil
        ];

        if success {
            Ok(())
        } else {
            Err(LaunchError::Unknown("Failed to launch app".to_string()))
        }
    }
}

#[cfg(target_os = "macos")]
pub fn open_url(url: &str) -> Result<(), LaunchError> {
    unsafe {
        let _pool = NSAutoreleasePool::new(nil);

        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        let ns_url = NSURL::alloc(nil).initWithString_(
            NSString::alloc(nil).init_str(url)
        );

        if ns_url == nil {
            return Err(LaunchError::Unknown("Invalid URL".to_string()));
        }

        let success: bool = msg_send![workspace, openURL: ns_url];

        if success {
            Ok(())
        } else {
            Err(LaunchError::Unknown("Failed to open URL".to_string()))
        }
    }
}

#[cfg(target_os = "macos")]
pub fn get_running_apps() -> Vec<RunningApp> {
    unsafe {
        let _pool = NSAutoreleasePool::new(nil);

        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        let running_apps: id = msg_send![workspace, runningApplications];

        let count: usize = msg_send![running_apps, count];
        let mut apps = Vec::new();

        for i in 0..count {
            let app: id = msg_send![running_apps, objectAtIndex: i];

            let bundle_id: id = msg_send![app, bundleIdentifier];
            let localized_name: id = msg_send![app, localizedName];
            let pid: i32 = msg_send![app, processIdentifier];

            if bundle_id != nil && localized_name != nil {
                let bundle_id_str = NSString::UTF8String(bundle_id);
                let name_str = NSString::UTF8String(localized_name);

                if !bundle_id_str.is_null() && !name_str.is_null() {
                    apps.push(RunningApp {
                        bundle_id: std::ffi::CStr::from_ptr(bundle_id_str)
                            .to_string_lossy()
                            .to_string(),
                        name: std::ffi::CStr::from_ptr(name_str)
                            .to_string_lossy()
                            .to_string(),
                        pid: pid as u32,
                    });
                }
            }
        }

        apps
    }
}

#[cfg(target_os = "macos")]
pub fn is_app_running(bundle_id: &str) -> bool {
    get_running_apps()
        .iter()
        .any(|app| app.bundle_id == bundle_id)
}

#[cfg(target_os = "macos")]
pub fn bring_app_to_front(bundle_id: &str) -> Result<(), LaunchError> {
    unsafe {
        let _pool = NSAutoreleasePool::new(nil);

        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        let running_apps: id = msg_send![workspace, runningApplications];

        let count: usize = msg_send![running_apps, count];

        for i in 0..count {
            let app: id = msg_send![running_apps, objectAtIndex: i];
            let app_bundle_id: id = msg_send![app, bundleIdentifier];

            if app_bundle_id != nil {
                let bundle_id_str = NSString::UTF8String(app_bundle_id);
                if !bundle_id_str.is_null() {
                    let id_str = std::ffi::CStr::from_ptr(bundle_id_str)
                        .to_string_lossy()
                        .to_string();

                    if id_str == bundle_id {
                        let _: bool = msg_send![app, activateWithOptions: 0];
                        return Ok(());
                    }
                }
            }
        }

        Err(LaunchError::NotFound)
    }
}

// Non-macOS stubs
#[cfg(not(target_os = "macos"))]
pub fn launch_app_with_file(_app_path: &str, _file_path: &str) -> Result<(), LaunchError> {
    Err(LaunchError::Unknown("macOS only feature".to_string()))
}

#[cfg(not(target_os = "macos"))]
pub fn launch_app(_app_path: &str) -> Result<(), LaunchError> {
    Err(LaunchError::Unknown("macOS only feature".to_string()))
}

#[cfg(not(target_os = "macos"))]
pub fn open_url(_url: &str) -> Result<(), LaunchError> {
    Err(LaunchError::Unknown("macOS only feature".to_string()))
}

#[cfg(not(target_os = "macos"))]
pub fn get_running_apps() -> Vec<RunningApp> {
    Vec::new()
}

#[cfg(not(target_os = "macos"))]
pub fn is_app_running(_bundle_id: &str) -> bool {
    false
}

#[cfg(not(target_os = "macos"))]
pub fn bring_app_to_front(_bundle_id: &str) -> Result<(), LaunchError> {
    Err(LaunchError::Unknown("macOS only feature".to_string()))
}
