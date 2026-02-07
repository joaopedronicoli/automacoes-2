import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from '../../entities/post.entity';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PostsSyncService } from './posts.sync.service';
import { PostsScheduler } from './posts.scheduler';
import { SocialAccountsModule } from '../social-accounts/social-accounts.module';
import { FacebookModule } from '../platforms/facebook/facebook.module';
import { PlansModule } from '../plans/plans.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Post]),
        SocialAccountsModule,
        forwardRef(() => FacebookModule),
        PlansModule,
    ],
    providers: [PostsService, PostsSyncService, PostsScheduler],
    controllers: [PostsController],
    exports: [PostsService, PostsSyncService],
})
export class PostsModule { }
