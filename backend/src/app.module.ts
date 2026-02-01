import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { typeOrmConfig } from './config/typeorm.config';
import { redisConfig } from './config/redis.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SocialAccountsModule } from './modules/social-accounts/social-accounts.module';
import { PostsModule } from './modules/posts/posts.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { LogsModule } from './modules/logs/logs.module';
import { QueueModule } from './modules/queue/queue.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { FacebookModule } from './modules/platforms/facebook/facebook.module';
import { InstagramModule } from './modules/platforms/instagram/instagram.module';
// import { YoutubeModule } from './modules/platforms/youtube/youtube.module'; // Desabilitado - sem credenciais
// import { TiktokModule } from './modules/platforms/tiktok/tiktok.module'; // Desabilitado - sem credenciais
import { StatsModule } from './modules/stats/stats.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        // Database
        TypeOrmModule.forRoot(typeOrmConfig()),

        // Schedule (for cron jobs)
        ScheduleModule.forRoot(),

        // Bull Queue
        BullModule.forRootAsync({
            useFactory: redisConfig,
        }),

        // Application modules
        AuthModule,
        UsersModule,
        SocialAccountsModule,
        PostsModule,
        AutomationsModule,
        LogsModule,
        QueueModule,
        WebhooksModule,
        FacebookModule,
        InstagramModule,
        // YoutubeModule, // Habilitar quando tiver GOOGLE_CLIENT_ID configurado
        // TiktokModule, // Habilitar quando tiver TIKTOK_CLIENT_KEY configurado
        StatsModule,
        IntegrationsModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
