import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // サーバー制御
  server: {
    setUrl: (url: string) => ipcRenderer.invoke('server:setUrl', url),
    checkConnection: () => ipcRenderer.invoke('server:checkConnection'),
    getStatus: () => ipcRenderer.invoke('server:status'),
    onStatusChange: (callback: (status: unknown) => void) => {
      ipcRenderer.on('server-status-changed', (_event, status) => callback(status))
      return () => ipcRenderer.removeAllListeners('server-status-changed')
    }
  },
  // YouTube制御
  youtube: {
    start: (liveId: string) => ipcRenderer.invoke('youtube:start', liveId),
    stop: () => ipcRenderer.invoke('youtube:stop')
  },
  // AI設定
  ai: {
    saveSettings: (provider: string, apiKey: string) => 
      ipcRenderer.invoke('ai:save-settings', provider, apiKey)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
