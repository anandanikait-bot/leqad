import { contextBridge, ipcRenderer } from 'electron';
import { createDesktopBridge } from './bridge';
import { createTutorBridge } from './tutorBridge';

contextBridge.exposeInMainWorld('leqad', createDesktopBridge(ipcRenderer));

contextBridge.exposeInMainWorld('leqadTutor', createTutorBridge(ipcRenderer));
