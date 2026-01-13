import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { LiveChat } from 'youtube-chat';
import { Subject } from 'rxjs';
import { CommentPayload } from '../../common/types/comment';

@Injectable()
export class YoutubeService implements OnModuleDestroy {
  private readonly logger = new Logger(YoutubeService.name);
  private liveChat: LiveChat | null = null;

  // 他のモジュール（Gateway等）がこのストリームを購読できるようにする
  public comment$ = new Subject<CommentPayload>();

  // 配信への接続開始
  async startChat(liveId: string) {
    try {
      this.liveChat = new LiveChat({ liveId });

      this.liveChat.on('chat', (chatItem) => {
        // メッセージアイテムを結合してテキスト化
        const text = chatItem.message
          .map((item) => ('text' in item ? item.text : item.emojiText))
          .join('');

        const payload: CommentPayload = {
          id: chatItem.id,
          name: chatItem.author.name,
          text,
          isGaya: false, // 本物のコメント
          avatarUrl: chatItem.author.thumbnail?.url,
          timestamp: Date.now(),
        };

        // 受信したコメントをSubject（ストリーム）に流す
        this.comment$.next(payload);
        this.logger.log(`[YouTube] ${payload.name}: ${payload.text}`);
      });

      this.liveChat.on('error', (err) => {
        this.logger.error('YouTube Chat Error:', err);
      });

      const success = await this.liveChat.start();
      if (success) {
        this.logger.log(`Started listening to YouTube: ${liveId}`);
      } else {
        this.logger.error('Failed to start YouTube Chat');
      }
    } catch (error) {
      this.logger.error('Connection error:', error);
    }
  }

  // 停止処理
  stopChat() {
    if (this.liveChat) {
      this.liveChat.stop();
      this.logger.log('Stopped YouTube Chat');
    }
  }

  // アプリ終了時に接続を閉じる（メモリリーク防止）
  onModuleDestroy() {
    this.stopChat();
  }
}