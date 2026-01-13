import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { CommentPayload } from '../../common/types/comment';

@Injectable()
export class BrainService {
  private readonly logger = new Logger(BrainService.name);
  
  // ガヤ専用のストリーム
  public gaya$ = new Subject<CommentPayload>();

  private readonly phrases = ['草', 'www', '88888', '天才か？', 'なるほどね', 'きたあああ'];

  constructor() {
    this.startGayaLoop();
  }

  private startGayaLoop() {
    // 5〜15秒のランダムな間隔でガヤを飛ばす
    const nextInterval = () => Math.floor(Math.random() * 10000) + 5000;

    const tick = () => {
      setTimeout(() => {
        this.emitGaya();
        tick();
      }, nextInterval());
    };
    tick();
  }

  private emitGaya() {
    const text = this.phrases[Math.floor(Math.random() * this.phrases.length)];
    const payload: CommentPayload = {
      id: `gaya-${Date.now()}`,
      name: 'GAYAIちゃん',
      text: text,
      isGaya: true, // ここが重要
      timestamp: Date.now(),
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=GAYAI', // 仮のAIアイコン
    };

    this.gaya$.next(payload);
    this.logger.log(`[Gaya] Generated: ${text}`);
  }
}