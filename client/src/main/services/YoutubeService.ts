// src/main/services/YoutubeService.ts
import { LiveChat } from 'youtube-chat';
import { BrowserWindow } from 'electron';
import { WebSocketService } from './WebSocketService';
import { CommentPayload } from '../types/comment';

export class YoutubeService {
  private liveChat: LiveChat | null = null;
  
  constructor(
    private mainWindow: BrowserWindow,
    private webSocketService?: WebSocketService
  ) {}

  /**
   * `youtube-chat` 側で稀にUTF-8文字列がlatin1扱いになり、`ã“` のような文字化けになることがあるため、
   * それっぽいケースだけ復元を試みる（正常系は絶対に壊さない）。
   */
  private fixUtf8MojibakeIfNeeded(input: string): string {
    // 既に日本語を含むなら変換しない（latin1変換はUnicodeを壊す可能性がある）
    if (this.countJapaneseLikeChars(input) > 0) return input;

    // 文字化けしがちな文字（UTF-8バイト列がlatin1解釈された時に出やすい）を含まないなら触らない
    if (!/[ÃÂãâêîôû]/.test(input)) return input;

    const decoded = Buffer.from(input, 'latin1').toString('utf8');
    // 復元後に日本語が増えていて、置換文字が少ない（= 変換が成功している）場合のみ採用
    if (this.countJapaneseLikeChars(decoded) > 0 && !decoded.includes('�')) {
      return decoded;
    }
    return input;
  }

  private countJapaneseLikeChars(input: string): number {
    // ひらがな・カタカナ・漢字・全角記号あたりをざっくり数える
    return (input.match(/[\u3000-\u303f\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/g) ?? []).length;
  }

  private isTextMessage(item: unknown): item is { text: string } {
    return typeof item === 'object' && item !== null && 'text' in item && typeof (item as { text: unknown }).text === 'string';
  }

  private getMessageText(messageItems: unknown[]): string {
    return messageItems
      .filter((item): item is { text: string } => this.isTextMessage(item))
      .map(item => item.text)
      .join('');
  }

  private setupEventHandlers(): void {
    if (!this.liveChat) return;

    this.liveChat.on('start', (id) => {
      console.log(`✅ Live chat started successfully! Live ID: ${id}`);
    });

    this.liveChat.on('chat', (chatItem) => {
      const rawAuthorName = chatItem.author.name;
      const rawMessageText = this.getMessageText(chatItem.message);
      const authorName = this.fixUtf8MojibakeIfNeeded(rawAuthorName);
      const messageText = this.fixUtf8MojibakeIfNeeded(rawMessageText);
      // 受信したコメントをコンソールに表示
      console.log(`[Comment] ${authorName}: ${messageText}`);

      const comment: CommentPayload = {
        id: chatItem.id,
        name: authorName,
        text: messageText,
        isGaya: false,
        avatarUrl: chatItem.author.thumbnail?.url,
        timestamp: Date.now()
      };

      // ElectronアプリのUIに送信
      this.mainWindow.webContents.send('new-comment', comment);

      // WebSocketでオーバーレイに配信
      if (this.webSocketService) {
        this.webSocketService.broadcastComment(comment);
      }
    });

    this.liveChat.on('error', (err) => {
      // エラーの種類に応じてメッセージを分ける
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorCode = (err as any)?.response?.status || (err as any)?.statusCode || (err as any)?.code;
      
      if (errorCode === 503 || errorMessage.includes('503')) {
        console.error('❌ YouTube Live Chat API が一時的に利用できません (503 Service Unavailable)');
        console.error('   考えられる原因:');
        console.error('   1. YouTube側の一時的な障害');
        console.error('   2. レート制限に達している可能性');
        console.error('   3. しばらく待ってから再試行してください');
      } else if (errorCode === 429 || errorMessage.includes('429')) {
        console.error('❌ YouTube Live Chat API のレート制限に達しました (429 Too Many Requests)');
        console.error('   しばらく待ってから再試行してください');
      } else if (errorCode === 403 || errorMessage.includes('403')) {
        console.error('❌ YouTube Live Chat API へのアクセスが拒否されました (403 Forbidden)');
        console.error('   APIキーまたは権限の問題の可能性があります');
      } else {
        console.error('❌ LiveChat error:', err);
      }
      
      // メインウィンドウにエラー通知を送信（オプション）
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('youtube-error', {
          code: errorCode,
          message: errorMessage
        });
      }
    });

    this.liveChat.on('end', (reason) => {
      console.log(`⚠️ Live chat ended: ${reason || 'Unknown reason'}`);
    });
  }

  public async start(liveId: string): Promise<void> {
    console.log(`Starting chat listener for liveId: ${liveId}`);
    
    this.liveChat = new LiveChat({ liveId });
    this.setupEventHandlers();
    
    const ok = await this.liveChat.start();
    if (!ok) {
      console.error('❌ Failed to start live chat. Please check:');
      console.error('  1. Is the live stream currently active?');
      console.error('  2. Is the liveId correct? (Use the ID from youtube.com/live/LIVE_ID, not v=VIDEO_ID)');
      console.error('  3. Or use startWithChannelId() instead');
    }
  }

  public async startWithChannelId(channelId: string): Promise<void> {
    console.log(`Starting chat listener for channelId: ${channelId}`);
    
    this.liveChat = new LiveChat({ channelId });
    this.setupEventHandlers();
    
    const ok = await this.liveChat.start();
    if (!ok) {
      console.error('❌ Failed to start live chat. Please check:');
      console.error('  1. Is the channel currently live streaming?');
      console.error('  2. Is the channelId correct? (Get from youtube.com/channel/CHANNEL_ID)');
    }
  }

  public stop(): void {
    this.liveChat?.stop();
  }
}