import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { YoutubeModule } from './modules/youtube/youtube.module';
import { BrainModule } from './modules/brain/brain.module';
import { GatewayModule } from './gateway/events.module';
import { YoutubeService } from './modules/youtube/youtube.service';

@Module({
  imports: [YoutubeModule, BrainModule, GatewayModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private readonly youtubeService: YoutubeService) {}

  async onApplicationBootstrap() {
    // テスト用のLive ID (YouTube URLの v=xxxx の部分)
    // 適当な24時間配信などのIDを入れてみてください
    const testLiveId = 'jfKfPfyJRdk'; 
    await this.youtubeService.startChat(testLiveId);
  }
}