import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerDesktopIpc, type DesktopIpcRegistration, type IpcWindow } from './ipc';
import { createDesktopStateStore, type DesktopStateStore } from './preferences';
import {
  createTrustedRendererUrlCheck,
  resolveDevServerUrl,
  resolveTestUserDataPath,
} from './runtimeConfig';
import { createSessionController, type SessionController } from './session';
import {
  createWindowPlacementController,
  type NativePanelWindow,
  type WindowPlacementController,
} from './windowPlacement';

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
let session: SessionController | null = null;
let ipcRegistration: DesktopIpcRegistration | null = null;
let shuttingDown = false;
let keepVisible = true;

function cleanupSession(): void {
  ipcRegistration?.dispose();
  ipcRegistration = null;
  session?.dispose();
  session = null;
}

function recreateSession(): void {
  if (shuttingDown || !mainWindow || mainWindow.isDestroyed() || !stateStore) return;
  cleanupSession();
  const ownerWindow = mainWindow;
  session = createSessionController({
    abortActive: () => undefined,
    resetPosition: () => placement?.resetPosition(),
    closeWindow: () => {
      if (!ownerWindow.isDestroyed()) ownerWindow.close();
    },
  });
  ipcRegistration = registerDesktopIpc({
    ipcMain: ipcMain as unknown as Parameters<typeof registerDesktopIpc>[0]['ipcMain'],
    getWindow: () => (ownerWindow.isDestroyed() ? null : ownerWindow as unknown as IpcWindow),
    isTrustedRendererUrl: createTrustedRendererUrlCheck(
      devServerUrl,
      pathToFileURL(path.join(__dirname, 'renderer', 'index.html')).toString(),
    ),
    controller: session,
    store: stateStore,
    onPreferencesSaved: (preferences) => {
      keepVisible = preferences.keepVisible;
    },
  });
}

function workAreas() {
  return screen.getAllDisplays().map((display) => display.workArea);
}

function createMainWindow(): void {
  if (mainWindow || shuttingDown) return;

  stateStore = createDesktopStateStore(
    path.join(app.getPath('userData'), 'desktop-state.json'),
  );
  void stateStore.loadPreferences().then(
    (preferences) => {
      keepVisible = preferences.keepVisible;
    },
    () => undefined,
  );

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

  placement = createWindowPlacementController({
    window: window as unknown as NativePanelWindow,
    getWorkAreas: workAreas,
    loadPlacement: () => stateStore!.loadPlacement(),
    savePlacement: (value) => stateStore!.savePlacement(value),
    keepVisible: () => keepVisible,
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
    if (!event.isMainFrame || !trustedRendererUrl(event.url)) event.preventDefault();
  });
  window.webContents.on('will-redirect', (event, targetUrl) => {
    if (!trustedRendererUrl(targetUrl)) {
      event.preventDefault();
      session?.invalidate();
    }
  });
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.webContents.on('did-start-navigation', (_event, _url, _inPlace, isMainFrame) => {
    if (isMainFrame) recreateSession();
  });
  window.webContents.on('render-process-gone', () => recreateSession());
  window.webContents.on('destroyed', cleanupSession);
  window.once('ready-to-show', () => {
    if (!window.isDestroyed()) window.show();
  });
  window.on('closed', () => {
    cleanupSession();
    placement?.dispose();
    placement = null;
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
});

if (gotSingleInstanceLock) {
  void app.whenReady().then(() => {
    createMainWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });
}
