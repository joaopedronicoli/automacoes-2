import { Module } from '@nestjs/common';
import { ChatwootService } from './chatwoot.service';

@Module({
    providers: [ChatwootService],
    exports: [ChatwootService],
})
export class ChatwootModule {}
