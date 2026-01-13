import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { YoutubeModule } from '../modules/youtube/youtube.module';
import { BrainModule } from '../modules/brain/brain.module';

@Module({
  providers: [EventsGateway],
  imports: [YoutubeModule, BrainModule],
})
export class GatewayModule {}
