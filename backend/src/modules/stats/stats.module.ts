import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { Post } from '../../entities/post.entity';
import { AutomationLog } from '../../entities/automation-log.entity';
import { SocialAccount } from '../../entities/social-account.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Post, AutomationLog, SocialAccount])
    ],
    controllers: [StatsController],
    providers: [StatsService],
    exports: [StatsService]
})
export class StatsModule { }
