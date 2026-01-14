import { ElectronAPI } from '@electron-toolkit/preload'

export interface ServerStatus {
  isConnected: boolean
  serverUrl: string | null
  overlayUrl: string | null
  lastChecked: number | null
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      server: {
        setUrl: (url: string) => Promise<{ success: boolean; error?: string }>
        checkConnection: () => Promise<{ success: boolean; error?: string }>
        getStatus: () => Promise<ServerStatus>
        onStatusChange: (callback: (status: ServerStatus) => void) => () => void
      }
      youtube: {
        start: (liveId: string) => Promise<{ success: boolean; error?: string }>
        stop: () => Promise<{ success: boolean; error?: string }>
      }
    }
  }
}
