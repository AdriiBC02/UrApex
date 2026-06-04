# UrApex Companion

Tauri desktop app (Windows) that watches your LMU results folder and auto-uploads sessions to UrApex.

## Setup

### 1. Install prerequisites (once)

```powershell
# Install Rust
winget install Rustlang.Rustup
rustup update

# Install WebView2 (usually already present on Windows 11)
# If not: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

# Install Node.js if not already present
winget install OpenJS.NodeJS
```

### 2. Install dependencies

```bash
cd companion
npm install
```

### 3. Run in dev mode

```bash
npm run tauri:dev
```

### 4. Build for Windows

```bash
npm run tauri:build
# Output: src-tauri/target/release/bundle/
```

## Usage

1. Open the app
2. Go to **Settings**
3. Set your **LMU Results folder** (usually `C:\Users\You\Documents\Le Mans Ultimate\UserData\player\Results`)
4. Set your **UrApex URL** (e.g. `https://your-urapex.app`)
5. Generate an **API key** in UrApex → Settings → Companion app, and paste it here
6. Go to **Sync** tab and click **Start watching**

The app will now detect new XML files as soon as LMU writes them after a session, and upload them automatically. It minimizes to the system tray.

## Architecture

- **Rust (Tauri backend)**: file watcher using `notify` crate + HTTP upload via `reqwest`
- **React frontend**: settings UI + sync log
- **Web app**: accepts `Authorization: Bearer <apiKey>` on `POST /api/upload`

## Future: In-game overlay

Tauri supports transparent always-on-top windows on Windows. The overlay phase will add:
- A second transparent window that shows real-time sector times during a session
- UDP telemetry listener (LMU broadcasts on port 4444)
- Mini dashboard: current lap delta, position, fuel remaining
