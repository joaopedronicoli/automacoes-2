import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { InboxService } from './inbox.service';
import { InboxController } from './inbox.controller';
import { FacebookModule } from '../platforms/facebook/facebook.module';
import { SocialAccountsModule } from '../social-accounts/social-accounts.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Conversation, Message]),
        forwardRef(() => FacebookModule),
        SocialAccountsModule,
    ],
    controllers: [InboxController],
    providers: [InboxService],
    exports: [InboxService],
})
export class InboxModule {}
