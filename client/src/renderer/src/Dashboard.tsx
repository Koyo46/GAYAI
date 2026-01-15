import { useEffect, useState, useCallback } from 'react'

// 1. 受信するデータの型を定義
interface GayaSettings {
  character: string;
  system_prompt: string;
  enabled: boolean;
}

interface Comment {
  id: string
  name: string
  text: string
  avatar?: string
}

interface ServerStatus {
  isConnected: boolean
  serverUrl: string | null
  overlayUrl: string | null
  lastChecked: number | null
}
type AiProvider = 'openai' | 'gemini';
function Dashboard(): React.JSX.Element {
  const [settings, setSettings] = useState<GayaSettings | null>(null);
  const [comments, setComments] = useState<Comment[]>([])
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    isConnected: false,
    serverUrl: null,
    overlayUrl: null,
    lastChecked: null
  })
  const [serverUrlInput, setServerUrlInput] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [liveId, setLiveId] = useState('')
  const [copied, setCopied] = useState(false)
  const [aiProvider, setAiProvider] = useState<AiProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [isAiSaved, setIsAiSaved] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // サーバー状態を取得
  useEffect(() => {
    // window.apiが利用可能になるまで待つ
    if (!window.api?.server) {
      console.warn('[Dashboard] window.api is not available yet')
      return
    }

    const loadStatus = async () => {
      try {
        const status = await window.api.server.getStatus()
        setServerStatus(status)
        if (status.serverUrl) {
          setServerUrlInput(status.serverUrl)
        }
      } catch (error) {
        console.error('[Dashboard] Failed to load server status:', error)
      }
    }
    loadStatus()

    // サーバー状態変更を監視
    const unsubscribe = window.api.server.onStatusChange((status) => {
      setServerStatus(status)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // サーバーURLが設定されたら設定を取得（接続状態に関係なく）
  useEffect(() => {
    if (serverStatus.serverUrl) {
      const fetchSettings = async () => {
        try {
          const url = `${serverStatus.serverUrl}/api/prompts/gaya-settings`
          console.log('[Dashboard] 設定を取得中:', url)
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('[Dashboard] Laravelから取得:', data);
          setSettings(data);
        } catch (error) {
          console.error('[Dashboard] Laravelとの通信に失敗:', error);
          // エラー時も設定をクリアしない（前回の設定を保持）
          // setSettings(null);
        }
      };
      fetchSettings();
    } else {
      // サーバーURLが未設定の場合は設定をクリア
      setSettings(null);
    }
  }, [serverStatus.serverUrl])

  // コメント受信
  useEffect(() => {
    const handleNewComment = (_event: unknown, comment: Comment) => {
      console.log('📨 Received comment:', comment)
      setComments((prev) => [...prev, comment])
    }

    window.electron.ipcRenderer.on('new-comment', handleNewComment)

    return () => {
      window.electron.ipcRenderer.removeAllListeners('new-comment')
    }
  }, [])

  // サーバーURL設定
  const handleSetServerUrl = async () => {
    if (!serverUrlInput.trim()) {
      alert('サーバーURLを入力してください')
      return
    }

    if (!window.api?.server) {
      alert('APIが利用できません。アプリを再起動してください。')
      return
    }

    setIsConnecting(true)
    try {
      const result = await window.api.server.setUrl(serverUrlInput.trim())
      if (result.success) {
        console.log('✅ Server URL set:', serverUrlInput)
        // 設定が自動的に取得される（useEffectで処理）
      } else {
        alert(`サーバーURL設定に失敗しました: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to set server URL:', error)
      alert(`サーバーURL設定に失敗しました: ${error}`)
    } finally {
      setIsConnecting(false)
    }
  }


  // YouTube配信開始
  const handleStartYouTube = async () => {
    if (!liveId.trim()) {
      alert('ライブIDを入力してください')
      return
    }

    if (!window.api?.youtube) {
      alert('APIが利用できません。アプリを再起動してください。')
      return
    }

    try {
      const result = await window.api.youtube.start(liveId.trim())
      if (result.success) {
        console.log('✅ YouTube chat started')
      } else {
        alert(`YouTube接続に失敗しました: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to start YouTube:', error)
      alert(`YouTube接続に失敗しました: ${error}`)
    }
  }

  // URLをクリップボードにコピー
  const handleCopyUrl = async () => {
    if (serverStatus.overlayUrl) {
      await navigator.clipboard.writeText(serverStatus.overlayUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // ★AI設定を保存する関数
  const handleSaveAiSettings = async () => {
    if (!apiKey.trim()) {
      alert('APIキーを入力してください');
      return;
    }

    if (!window.api?.ai) {
      alert('APIが利用できません。アプリを再起動してください。');
      return;
    }

    try {
      const success = await window.api.ai.saveSettings(aiProvider, apiKey.trim());
      if (success) {
        setIsAiSaved(true);
        alert(`✅ ${aiProvider === 'openai' ? 'OpenAI' : 'Gemini'} の設定を保存しました！`);
        // 3秒後に「保存済み」表示を消す演出
        setTimeout(() => setIsAiSaved(false), 3000);
      }
    } catch (error) {
      console.error(error);
      alert('設定の保存に失敗しました');
    }
  };
  
  // 録音開始処理（共通）
  const startRecording = useCallback(async () => {
    if (isListening) return; // 既に録音中なら何もしない

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      // 停止時にデータを送信するイベント（完全なWebMファイルを取得）
      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const buffer = await e.data.arrayBuffer();
          // メインプロセスに送信！
          console.log(`🎤 音声データ送信: ${(buffer.byteLength / 1024).toFixed(2)}KB`);
          try {
            const result = await (window.api.ai.processAudio(buffer) as unknown) as { text: string; gaya: string } | null;
            if (result !== null && typeof result === 'object' && 'text' in result && 'gaya' in result) {
              console.log(`✅ 処理完了: "${result.text}" → "${result.gaya}"`);
            } else {
              console.log('⚠️ 無音または雑音のためスキップ');
            }
          } catch (error) {
            console.error('❌ 音声処理エラー:', error);
          }
        }
      };

      // 停止時の処理
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      // 引数なしでstart（stop()を呼んだ時に完全なデータを取得）
      recorder.start(); 
      setMediaRecorder(recorder);
      setAudioStream(stream);
      setIsListening(true);
      
    } catch (err) {
      console.error('マイクの取得に失敗:', err);
      alert('マイクの使用を許可してください');
    }
  }, [isListening]);

  // 録音停止処理（共通）
  const stopRecording = useCallback(() => {
    if (!isListening) return; // 録音中でなければ何もしない

    setMediaRecorder((currentRecorder) => {
      if (currentRecorder) {
        currentRecorder.stop();
        currentRecorder.stream.getTracks().forEach(track => track.stop());
      }
      return null;
    });
    setAudioStream((currentStream) => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      return null;
    });
    setIsListening(false);
  }, [isListening]);

  // 録音開始/停止ボタンの処理
  const toggleListening = async () => {
    if (isListening) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  // スペースキーで録音制御
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // スペースキーが押された時（入力欄にフォーカスがある場合は無視）
      const target = e.target as HTMLElement;
      if (e.code === 'Space' && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault(); // ページスクロールを防ぐ
        if (!isSpacePressed && !isListening) {
          setIsSpacePressed(true);
          await startRecording();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // スペースキーが離された時
      if (e.code === 'Space') {
        e.preventDefault();
        if (isSpacePressed && isListening) {
          setIsSpacePressed(false);
          stopRecording();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isListening, isSpacePressed, startRecording, stopRecording]);

  // コンポーネントのアンマウント時にストリームをクリーンアップ
  useEffect(() => {
    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    };
  }, [audioStream, mediaRecorder]);

  return (
    <div style={{ 
      padding: 24, 
      background: '#1a1a1a', 
      color: '#ffffff',
      height: '100vh',
      overflow: 'auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, marginBottom: 8, fontSize: 28 }}>GAYAI Client</h1>
        <div style={{ fontSize: 14, color: '#888' }}>
          YouTube配信のガヤAIサービス
        </div>
      </div>

      <div style={{ 
        background: '#2a2a2a', 
        padding: 20, 
        borderRadius: 12, 
        marginBottom: 24,
        border: '1px solid #444'
      }}>
        <h2 style={{ margin: 0, marginBottom: 16, fontSize: 18, display: 'flex', alignItems: 'center' }}>
          🧠 AI頭脳設定
          {isAiSaved && <span style={{ marginLeft: 10, fontSize: 12, color: '#4caf50' }}>✓ 保存完了</span>}
        </h2>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          {/* AI切り替えプルダウン */}
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value as AiProvider)}
            style={{
              padding: '10px',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            <option value="gemini">Gemini (推奨・無料枠大)</option>
            <option value="openai">OpenAI (GPT-4o)</option>
          </select>

          {/* APIキー入力欄 */}
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`${aiProvider === 'openai' ? 'sk-...' : 'AIza...'} キーを入力`}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: 6
            }}
          />

          {/* 保存ボタン */}
          <button
            onClick={handleSaveAiSettings}
            style={{
              padding: '10px 20px',
              background: '#9c27b0', // 紫色で「AI感」を出す
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            保存
          </button>
        </div>
        
        <div style={{ fontSize: 12, color: '#888' }}>
          ※ アプリを再起動するとキーはリセットされます（セキュリティのため今は保存しません）
        </div>
      </div>

      {/* 本社(Laravel)からの指令 */}
      {serverStatus.serverUrl && (
        <div style={{ border: '1px solid #00ff00', padding: 10, marginBottom: 20 }}>
          <h3>本社(Laravel)からの指令:</h3>
          {settings ? (
            <ul>
              <li><b>キャラ:</b> {settings.character}</li>
              <li><b>プロンプト:</b> {settings.system_prompt}</li>
              <li><b>状態:</b> {settings.enabled ? '稼働中' : '停止中'}</li>
            </ul>
          ) : (
            <p style={{ color: '#888' }}>
              {serverStatus.isConnected ? '設定を取得中...' : 'サーバーに接続できていません。設定を取得できません。'}
            </p>
          )}
        </div>
      )}

      {/* サーバー設定セクション */}
      <div style={{ 
        background: '#2a2a2a', 
        padding: 20, 
        borderRadius: 12, 
        marginBottom: 24 
      }}>
        <h2 style={{ margin: 0, marginBottom: 16, fontSize: 18 }}>サーバー設定</h2>
        
        {/* 接続状態表示（設定が取得できていれば接続中） */}
        {serverStatus.serverUrl && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              background: settings ? '#4caf50' : '#ff9800',
              boxShadow: settings ? '0 0 8px #4caf50' : 'none'
            }} />
            <span style={{ fontSize: 14 }}>
              {settings 
                ? `✅ 接続中 (${serverStatus.serverUrl})` 
                : `⏳ 接続中... (${serverStatus.serverUrl})`}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={serverUrlInput}
            onChange={(e) => setServerUrlInput(e.target.value)}
            placeholder="サーバーURLを入力 (例: http://localhost または http://your-server.com)"
            style={{
              flex: 1,
              padding: '10px 12px',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: 6,
              fontSize: 14
            }}
          />
          <button
            onClick={handleSetServerUrl}
            disabled={isConnecting}
            style={{
              padding: '10px 20px',
              background: '#2196f3',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 'bold',
              opacity: isConnecting ? 0.6 : 1
            }}
          >
            {isConnecting ? '保存中...' : '💾 保存'}
          </button>
        </div>

        {/* OBSオーバーレイURL */}
        {serverStatus.overlayUrl && (
          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            background: '#1a1a1a', 
            borderRadius: 8 
          }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
              OBSブラウザソース用URL:
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code style={{ 
                flex: 1, 
                padding: 8, 
                background: '#0a0a0a', 
                borderRadius: 4, 
                fontSize: 12,
                wordBreak: 'break-all'
              }}>
                {serverStatus.overlayUrl}
              </code>
              <button
                onClick={handleCopyUrl}
                style={{
                  padding: '8px 16px',
                  background: copied ? '#4caf50' : '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12,
                  whiteSpace: 'nowrap'
                }}
              >
                {copied ? '✓ コピー済み' : '📋 コピー'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
              OBSで「ブラウザソース」を追加し、このURLを入力してください
            </div>
          </div>
        )}
      </div>

      {/* YouTube配信制御セクション */}
      <div style={{ 
        background: '#2a2a2a', 
        padding: 20, 
        borderRadius: 12, 
        marginBottom: 24 
      }}>
        <h2 style={{ margin: 0, marginBottom: 16, fontSize: 18 }}>YouTube配信</h2>
        
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={liveId}
            onChange={(e) => setLiveId(e.target.value)}
            placeholder="ライブIDを入力 (例: jfKfPfyJRdk)"
            style={{
              flex: 1,
              padding: '10px 12px',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: 6,
              fontSize: 14
            }}
          />
          <button
            onClick={handleStartYouTube}
            disabled={!settings}
            style={{
              padding: '10px 20px',
              background: settings ? '#2196f3' : '#666',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: settings ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 'bold'
            }}
          >
            ▶ 配信開始
          </button>
        </div>
        
        <div style={{ fontSize: 12, color: '#888' }}>
          {!settings 
            ? '⚠️ サーバーURLを設定してから配信を開始してください'
            : 'ライブIDは YouTube URL の v=xxxx の部分です'}
        </div>
      </div>

      {/* コメント表示セクション */}
      <div style={{ 
        background: '#2a2a2a', 
        padding: 20, 
        borderRadius: 12 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>コメント</h2>
          <div style={{ fontSize: 14, color: '#888' }}>
            {comments.length}件
            {comments.length > 0 && (
              <span style={{ color: '#4caf50', marginLeft: 8 }}>● 受信中</span>
            )}
          </div>
        </div>
        
        {comments.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 40, 
            color: '#666',
            fontSize: 14
          }}>
            <p>コメントがまだありません</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              サーバーを起動し、YouTube配信を開始するとコメントが表示されます
            </p>
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 12,
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {comments.slice(-50).reverse().map((c) => (
              <div 
                key={c.id} 
                style={{
                  background: '#1a1a1a',
                  padding: 12,
                  borderRadius: 8,
                  borderLeft: '3px solid #4caf50',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start'
                }}
              >
                {c.avatar && (
                  <img 
                    src={c.avatar} 
                    alt={c.name}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    color: '#4caf50',
                    marginBottom: 4,
                    fontSize: 14
                  }}>
                    {c.name}
                  </div>
                  <div style={{ 
                    color: '#e0e0e0',
                    fontSize: 14,
                    wordBreak: 'break-word'
                  }}>
                    {c.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <button 
          onClick={toggleListening}
          style={{
            background: isListening ? '#ff4444' : '#4caf50',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 'bold'
          }}
        >
          {isListening ? '🛑 聞き耳停止' : '👂 聞き耳開始'}
        </button>
    </div>
  )
}

export default Dashboard
