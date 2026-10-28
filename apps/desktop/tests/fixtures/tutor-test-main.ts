/** Test-only Electron entry. Never imported by production main or build scripts.
 * Real IPC/service/storage with a deterministic injected provider. All replies
 * and screenshots explicitly identify simulated output. No network request.
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { createTutorService } from '../../src/main/tutor/service';
import { createLearnerProfileStore } from '../../src/main/tutor/memory';
import { registerTutorIpc } from '../../src/main/tutorIpc';
import {
  registerDesktopIpc,
  type IpcMainPort,
  type IpcWindow,
} from '../../src/main/ipc';
import { createDesktopStateStore } from '../../src/main/preferences';
import { createSessionController } from '../../src/main/session';
import { resolveTestUserDataPath } from '../../src/main/runtimeConfig';
const userData = resolveTestUserDataPath(
  process.env.LEQAD_DESKTOP_USER_DATA,
  process.env.LEQAD_DESKTOP_TEST_MODE,
  os.tmpdir(),
);
if (!userData) throw new Error('Isolated test profile required');
app.setPath('userData', userData);
void app.whenReady().then(() => {
  const renderer = path.join(__dirname, 'renderer', 'index.html');
  const trusted = pathToFileURL(renderer).toString();
  const win = new BrowserWindow({
    width: 365,
    height: 600,
    minWidth: 320,
    minHeight: 400,
    useContentSize: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== trusted) event.preventDefault();
  });
  const store = createDesktopStateStore(
    path.join(userData, 'desktop-state.json'),
  );
  const profileStore = createLearnerProfileStore(
    path.join(userData, 'learner-profile.json'),
  );
  const catalog = {
    list: async () => ({
      availability: 'unavailable' as const,
      unavailableReason: 'unsupported' as const,
      incomplete: false,
      windows: [],
    }),
    select: async () => null,
    isCurrent: async () => false,
    dispose: () => undefined,
  };
  const session = createSessionController({
    abortActive: () => undefined,
    resetPosition: () => undefined,
    closeWindow: () => win.close(),
    windowCatalog: catalog,
  });
  const shared = {
    ipcMain: ipcMain as unknown as IpcMainPort,
    getWindow: () => (win.isDestroyed() ? null : (win as unknown as IpcWindow)),
    isTrustedRendererUrl: (url: string) => url === trusted,
  };
  const desktop = registerDesktopIpc({
    ...shared,
    controller: session,
    windowCatalog: catalog,
    store,
  });
  const tutor = registerTutorIpc({
    ...shared,
    service: createTutorService({
      profileStore,
      loadLesson: () => store.loadLesson(),
      provider: {
        mode: 'test',
        async reply(messages, signal) {
          const question = messages.at(-1)!.content;
          if (question === 'Wait for cancellation') {
            return new Promise<string>((_resolve, reject) =>
              signal.addEventListener(
                'abort',
                () => reject(new Error('Cancelled test request')),
                { once: true },
              ),
            );
          }
          if (question === 'Trigger test error')
            throw new Error('Test provider unavailable');
          if (/confused/i.test(question))
            return 'Simulated reply: Think of the rectangle as a picture frame. Set its width first, then its height. Try one horizontal edge with Dimension and enter 40 mm.';
          if (messages[0]!.content.includes('"topic":"dimensioning"'))
            return 'Simulated reply: You previously asked about dimensioning. We can revisit it without assuming anything about your drawing. Choose Dimension, then set a horizontal edge to 40 mm and a vertical edge to 30 mm.';
          return 'Simulated reply: Choose Dimension. Click a horizontal rectangle edge, click to place its dimension, and enter 40 mm. Repeat on a vertical edge with 30 mm.';
        },
      },
    }),
  });
  win.on('closed', () => {
    tutor.dispose();
    desktop.dispose();
    session.dispose();
    app.quit();
  });
  void win.loadFile(renderer);
});
