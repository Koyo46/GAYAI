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
      const messageText = this.getMessageText(chatItem.message);
      // 受信したコメントをコンソールに表示
      console.log(`[Comment] ${chatItem.author.name}: ${messageText}`);

      const comment: CommentPayload = {
        id: chatItem.id,
        name: chatItem.author.name,
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