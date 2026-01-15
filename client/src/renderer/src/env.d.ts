/// <reference types="vite/client" />

// サーバーの状態を表す型
interface ServerStatus {
  isConnected: boolean
  serverUrl: string | null
  overlayUrl: string | null
  lastChecked: number | null
}

interface Window {
  electron: {
    ipcRenderer: {
      send: (channel: string, ...args: any[]) => void
      on: (channel: string, func: (...args: any[]) => void) => void
      once: (channel: string, func: (...args: any[]) => void) => void
      removeAllListeners: (channel: string) => void
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }
  }

  // 私たちが作ったカスタムAPIの定義
  api: {
    // 1. サーバー接続関連
    server: {
      getStatus: () => Promise<ServerStatus>
      setUrl: (url: string) => Promise<{ success: boolean; error?: string }>
      checkConnection: () => Promise<{ success: boolean; error?: string }>
      onStatusChange: (callback: (status: ServerStatus) => void) => () => void
    }
    
    // 2. YouTube関連
    youtube: {
      start: (liveId: string) => Promise<{ success: boolean; error?: string }>
    }

    // 3. ★今回追加したAI関連
    ai: {
      saveSettings: (provider: 'openai' | 'gemini', apiKey: string) => Promise<boolean>
    }
  }
}