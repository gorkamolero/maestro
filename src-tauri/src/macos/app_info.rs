#[cfg(target_os = "macos")]
use cocoa::appkit::{NSImage, NSWorkspace};
#[cfg(target_os = "macos")]
use cocoa::base::{id, nil};
#[cfg(target_os = "macos")]
use cocoa::foundation::{NSAutoreleasePool, NSData, NSString};
#[cfg(target_os = "macos")]
use core_foundation::bundle::{CFBundle, CFBundleRef};
#[cfg(target_os = "macos")]
use core_foundation::string::CFString;
#[cfg(target_os = "macos")]
use objc::{msg_send, sel, sel_impl};
use std::path::Path;

use crate::models::{AppCapabilities, ConnectedApp};

#[derive(Debug)]
pub enum AppInfoError {
    NotFound,
    InvalidBundle,
    NoBundleId,
    FailedToExtractIcon,
    Other(String),
}

impl std::fmt::Display for AppInfoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotFound => write!(f, "Application not found"),
            Self::InvalidBundle => write!(f, "Invalid application bundle"),
            Self::NoBundleId => write!(f, "No bundle identifier found"),
            Self::FailedToExtractIcon => write!(f, "Failed to extract app icon"),
            Self::Other(msg) => write!(f, "{}", msg),
        }
    }
}

impl std::error::Error for AppInfoError {}

#[cfg(target_os = "macos")]
pub fn extract_app_info(app_path: &str) -> Result<ConnectedApp, AppInfoError> {
    // Verify path exists
    if !Path::new(app_path).exists() {
        return Err(AppInfoError::NotFound);
    }

    let bundle = get_bundle(app_path)?;
    let bundle_id = get_bundle_id(&bundle)?;
    let name = get_app_name(&bundle, app_path);
    let icon = extract_app_icon(app_path)?;
    let capabilities = extract_capabilities(&bundle);

    Ok(ConnectedApp::new(
        bundle_id,
        name,
        app_path.to_string(),
        icon,
        capabilities,
    ))
}

#[cfg(target_os = "macos")]
fn get_bundle(app_path: &str) -> Result<CFBundle, AppInfoError> {
    let url = core_foundation::url::CFURL::from_path(app_path, true)
        .ok_or(AppInfoError::InvalidBundle)?;

    CFBundle::new(url).ok_or(AppInfoError::InvalidBundle)
}

#[cfg(target_os = "macos")]
fn get_bundle_id(bundle: &CFBundle) -> Result<String, AppInfoError> {
    bundle
        .identifier()
        .map(|id| id.to_string())
        .ok_or(AppInfoError::NoBundleId)
}

#[cfg(target_os = "macos")]
fn get_app_name(bundle: &CFBundle, app_path: &str) -> String {
    // Try CFBundleDisplayName
    if let Some(info_dict) = bundle.info_dictionary() {
        if let Some(display_name) = info_dict.find(CFString::from_static_string("CFBundleDisplayName").as_concrete_TypeRef()) {
            let cf_string = unsafe { CFString::wrap_under_get_rule(display_name as *const _) };
            return cf_string.to_string();
        }

        // Try CFBundleName
        if let Some(bundle_name) = info_dict.find(CFString::from_static_string("CFBundleName").as_concrete_TypeRef()) {
            let cf_string = unsafe { CFString::wrap_under_get_rule(bundle_name as *const _) };
            return cf_string.to_string();
        }
    }

    // Fallback: extract from path
    Path::new(app_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown App")
        .to_string()
}

#[cfg(target_os = "macos")]
fn extract_app_icon(app_path: &str) -> Result<String, AppInfoError> {
    unsafe {
        let _pool = NSAutoreleasePool::new(nil);

        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        let path_ns_string = NSString::alloc(nil).init_str(app_path);

        let icon: id = msg_send![workspace, iconForFile: path_ns_string];

        if icon == nil {
            return Err(AppInfoError::FailedToExtractIcon);
        }

        // Create a representation of the icon
        let tiff_data: id = msg_send![icon, TIFFRepresentation];

        if tiff_data == nil {
            return Err(AppInfoError::FailedToExtractIcon);
        }

        // Get PNG representation for better web compatibility
        let bitmap_class = class!(NSBitmapImageRep);
        let bitmap_rep: id = msg_send![bitmap_class, imageRepWithData: tiff_data];

        if bitmap_rep == nil {
            return Err(AppInfoError::FailedToExtractIcon);
        }

        // Convert to PNG
        let png_type = cocoa::appkit::NSBitmapImageFileType::NSPNGFileType;
        let png_data: id = msg_send![bitmap_rep, representationUsingType:png_type properties:nil];

        if png_data == nil {
            return Err(AppInfoError::FailedToExtractIcon);
        }

        // Convert NSData to Vec<u8>
        let length: usize = msg_send![png_data, length];
        let bytes: *const u8 = msg_send![png_data, bytes];
        let data_slice = std::slice::from_raw_parts(bytes, length);

        // Base64 encode
        let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, data_slice);

        Ok(encoded)
    }
}

#[cfg(target_os = "macos")]
fn extract_capabilities(bundle: &CFBundle) -> AppCapabilities {
    let mut url_schemes = Vec::new();
    let mut file_associations = Vec::new();

    if let Some(info_dict) = bundle.info_dictionary() {
        // Extract URL schemes
        if let Some(url_types) = info_dict.find(CFString::from_static_string("CFBundleURLTypes").as_concrete_TypeRef()) {
            // Parse URL types array (simplified)
            // In a full implementation, you'd parse the plist array structure
            url_schemes.push("custom".to_string());
        }

        // Extract file associations
        if let Some(doc_types) = info_dict.find(CFString::from_static_string("CFBundleDocumentTypes").as_concrete_TypeRef()) {
            // Parse document types array (simplified)
            // In a full implementation, you'd parse the plist array structure
            file_associations.push("*".to_string());
        }
    }

    let url_scheme = url_schemes.first().cloned();

    AppCapabilities {
        url_scheme,
        applescriptable: false, // TODO: Implement AppleScript detection
        file_associations,
    }
}

// Non-macOS stub
#[cfg(not(target_os = "macos"))]
pub fn extract_app_info(_app_path: &str) -> Result<ConnectedApp, AppInfoError> {
    Err(AppInfoError::Other("macOS only feature".to_string()))
}
