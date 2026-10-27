import { contextBridge, ipcRenderer } from 'electron';
import { createDesktopBridge } from './bridge';

contextBridge.exposeInMainWorld('leqad', createDesktopBridge(ipcRenderer));
