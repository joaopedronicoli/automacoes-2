import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactInteraction } from '../../entities/contact-interaction.entity';
import { Contact } from '../../entities/contact.entity';
import { Post } from '../../entities/post.entity';
import { SocialAccount } from '../../entities/social-account.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { FacebookModule } from '../platforms/facebook/facebook.module';
import { SocialAccountsModule } from '../social-accounts/social-accounts.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ContactInteraction, Contact, Post, SocialAccount]),
        forwardRef(() => FacebookModule),
        SocialAccountsModule,
    ],
    controllers: [CommentsController],
    providers: [CommentsService],
    exports: [CommentsService],
})
export class CommentsModule {}
