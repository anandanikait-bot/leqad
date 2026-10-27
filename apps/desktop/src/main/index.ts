import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  registerDesktopIpc,
  type DesktopIpcRegistration,
  type IpcWindow,
} from './ipc';
import { createDesktopStateStore, type DesktopStateStore } from './preferences';
import {
  createTrustedRendererUrlCheck,
  resolveDevServerUrl,
  resolveTestUserDataPath,
} from './runtimeConfig';
import { createSessionController, type SessionController } from './session';
import { createWindowCatalogProvider } from './windowCatalog';
import {
  createWindowPreferenceController,
  type WindowPreferenceController,
} from './windowPreferences';
import {
  createWindowPlacementController,
  type NativePanelWindow,
  type WindowPlacementController,
} from './windowPlacement';

app.setName('Leqad');
// Keep ordinary development state separate from other Electron applications.
app.setPath('userData', path.join(app.getPath('appData'), 'Leqad'));

const devServerUrl = resolveDevServerUrl(process.env.LEQAD_DESKTOP_DEV_URL);
const testUserDataPath = resolveTestUserDataPath(
  process.env.LEQAD_DESKTOP_USER_DATA,
  process.env.LEQAD_DESKTOP_TEST_MODE,
  os.tmpdir(),
);
if (testUserDataPath) {
  mkdirSync(testUserDataPath, { recursive: true });
  app.setPath('userData', testUserDataPath);
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();

let mainWindow: BrowserWindow | null = null;
let stateStore: DesktopStateStore | null = null;
let placement: WindowPlacementController | null = null;
let windowPreferences: WindowPreferenceController | null = null;
let session: SessionController | null = null;
let sessionHealthTimer: NodeJS.Timeout | null = null;
let ipcRegistration: DesktopIpcRegistration | null = null;
let shuttingDown = false;

function cleanupSession(): void {
  if (sessionHealthTimer) clearInterval(sessionHealthTimer);
  sessionHealthTimer = null;
  ipcRegistration?.dispose();
  ipcRegistration = null;
  session?.dispose();
  session = null;
}

function recreateSession(): void {
  if (shuttingDown || !mainWindow || mainWindow.isDestroyed() || !stateStore)
    return;
  cleanupSession();
  const ownerWindow = mainWindow;
  const windowCatalog = createWindowCatalogProvider();
  session = createSessionController({
    abortActive: () => undefined,
    resetPosition: () => placement?.resetPosition(),
    closeWindow: () => {
      if (!ownerWindow.isDestroyed()) ownerWindow.close();
    },
    windowCatalog,
  });
  ipcRegistration = registerDesktopIpc({
    ipcMain: ipcMain as unknown as Parameters<
      typeof registerDesktopIpc
    >[0]['ipcMain'],
    getWindow: () =>
      ownerWindow.isDestroyed() ? null : (ownerWindow as unknown as IpcWindow),
    isTrustedRendererUrl: createTrustedRendererUrlCheck(
      devServerUrl,
      pathToFileURL(path.join(__dirname, 'renderer', 'index.html')).toString(),
    ),
    controller: session,
    windowCatalog,
    store: stateStore,
    onPreferencesSaved: (preferences) => {
      windowPreferences?.setKeepVisible(preferences.keepVisible);
      const currentPlacement = placement;
      if (currentPlacement) {
        void currentPlacement
          .applyBounds(currentPlacement.getBounds())
          .catch(() => undefined);
      }
    },
  });
  let healthCheckInFlight = false;
  sessionHealthTimer = setInterval(() => {
    const currentSession = session;
    if (
      healthCheckInFlight ||
      !currentSession ||
      currentSession.getView().paused
    ) {
      return;
    }
    healthCheckInFlight = true;
    void currentSession.checkWindow().finally(() => {
      healthCheckInFlight = false;
    });
  }, 1200);
  // This window-owned timer must keep waking Electron's Node loop while idle.
  // cleanupSession clears it on navigation, window close, and application exit.
}

function workAreas() {
  return screen.getAllDisplays().map((display) => display.workArea);
}

function createMainWindow(): void {
  if (mainWindow || shuttingDown) return;

  stateStore = createDesktopStateStore(
    path.join(app.getPath('userData'), 'desktop-state.json'),
  );
  const preferencesPromise = stateStore.loadPreferences();

  const window = new BrowserWindow({
    x: 8,
    y: 8,
    width: 365,
    height: 600,
    minWidth: 320,
    minHeight: 400,
    useContentSize: true,
    show: false,
    title: 'Leqad · Written Lessons',
    backgroundColor: '#F5EFE7',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      devTools: Boolean(devServerUrl),
    },
  });
  mainWindow = window;
  windowPreferences = createWindowPreferenceController(window);

  placement = createWindowPlacementController({
    window: window as unknown as NativePanelWindow,
    getWorkAreas: workAreas,
    loadPlacement: async () => {
      const preferences = await preferencesPromise;
      windowPreferences?.setKeepVisible(preferences.keepVisible);
      return stateStore!.loadPlacement();
    },
    savePlacement: (value) => stateStore!.savePlacement(value),
    keepVisible: () => windowPreferences?.getKeepVisible() ?? true,
  });
  void placement.initialize().catch(() => undefined);

  const trustedRendererUrl = createTrustedRendererUrlCheck(
    devServerUrl,
    pathToFileURL(path.join(__dirname, 'renderer', 'index.html')).toString(),
  );
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (!trustedRendererUrl(targetUrl)) {
      event.preventDefault();
      session?.invalidate();
    }
  });
  window.webContents.on('will-frame-navigate', (event) => {
    if (!event.isMainFrame || !trustedRendererUrl(event.url))
      event.preventDefault();
  });
  window.webContents.on('will-redirect', (event, targetUrl) => {
    if (!trustedRendererUrl(targetUrl)) {
      event.preventDefault();
      session?.invalidate();
    }
  });
  window.webContents.on('will-attach-webview', (event) =>
    event.preventDefault(),
  );
  window.webContents.on(
    'did-start-navigation',
    (_event, _url, _inPlace, isMainFrame) => {
      if (isMainFrame) recreateSession();
    },
  );
  window.webContents.on('render-process-gone', () => recreateSession());
  window.webContents.on('destroyed', cleanupSession);
  window.once('ready-to-show', () => {
    if (!window.isDestroyed()) window.show();
  });
  window.on('closed', () => {
    cleanupSession();
    placement?.dispose();
    placement = null;
    windowPreferences = null;
    mainWindow = null;
  });

  recreateSession();
  if (devServerUrl) {
    void window.loadURL(devServerUrl);
  } else {
    void window.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }
}

app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.on('before-quit', () => {
  shuttingDown = true;
  cleanupSession();
  placement?.dispose();
  placement = null;
  windowPreferences = null;
});

if (gotSingleInstanceLock) {
  void app.whenReady().then(() => {
    createMainWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });
}
