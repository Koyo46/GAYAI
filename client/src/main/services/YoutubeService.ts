// src/main/services/YoutubeService.ts
import { LiveChat } from 'youtube-chat';
import { BrowserWindow } from 'electron';

export class YoutubeService {
  private liveChat: LiveChat | null = null;
  
  // 画面（Renderer）にデータを送るために Window を受け取る
  constructor(private mainWindow: BrowserWindow) {}

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

  private setupEventHandlers() {
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

      this.mainWindow.webContents.send('new-comment', {
        id: chatItem.id,
        name: authorName,
        text: messageText,
        avatar: chatItem.author.thumbnail?.url
      });
    });

    this.liveChat.on('error', (err) => {
      console.error('❌ LiveChat error:', err);
    });

    this.liveChat.on('end', (reason) => {
      console.log(`⚠️ Live chat ended: ${reason || 'Unknown reason'}`);
    });
  }

  public async start(liveId: string) {
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

  public async startWithChannelId(channelId: string) {
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

  public stop() {
    this.liveChat?.stop();
  }
}