const { exec } = require('child_process');

/**
 * Registers Windows Shell Icon Overlays for ADS-Drive sync statuses.
 * Under Windows, File Explorer looks under:
 * HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\ShellIconOverlayIdentifiers
 * to map overlay handlers.
 */
function registerWindowsOverlays() {
  if (process.platform !== 'win32') {
    console.log("ℹ️ Windows overlays skipped: Not running on Windows");
    return;
  }

  // Custom GUIDs for ADS-Drive Overlay Handlers
  const overlays = [
    { name: "  ADSDriveSynced", guid: "{E0DF0101-0000-0000-0000-000000000001}" },
    { name: "  ADSDriveSyncing", guid: "{E0DF0101-0000-0000-0000-000000000002}" },
    { name: "  ADSDriveCloudOnly", guid: "{E0DF0101-0000-0000-0000-000000000003}" }
  ];

  overlays.forEach(overlay => {
    // We register under HKCU so it doesn't require admin elevation
    const keyPath = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ShellIconOverlayIdentifiers\\${overlay.name}`;
    const command = `reg add "${keyPath}" /ve /t REG_SZ /d "${overlay.guid}" /f`;
    
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(`❌ Failed to register overlay ${overlay.name}:`, err.message);
      } else {
        console.log(`✅ Registered Windows Overlay: ${overlay.name}`);
      }
    });
  });
  
  // Note: To register the application as a modern Cloud Files Provider (OneDrive-style),
  // Windows uses the StorageProvider Sync Root registry:
  // HKLM\Software\Microsoft\Windows\CurrentVersion\Explorer\SyncRootManager
  // We can write that registration block as well for production Cloud Sync.
}

module.exports = { registerWindowsOverlays };
