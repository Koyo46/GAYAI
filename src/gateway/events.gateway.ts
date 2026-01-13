import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { YoutubeService } from '../modules/youtube/youtube.service';
import { BrainService } from '../modules/brain/brain.service';

@WebSocketGateway({
  cors: { origin: '*' }, // OBSからの接続を許可
})
export class EventsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly brainService: BrainService,
  ) {}

  afterInit() {
    // YouTubeコメントを転送
    this.youtubeService.comment$.subscribe((comment) => {
      this.server.emit('new-comment', comment);
    });

    // AIガヤを転送
    this.brainService.gaya$.subscribe((gaya) => {
      this.server.emit('new-comment', gaya);
    });
  }
}