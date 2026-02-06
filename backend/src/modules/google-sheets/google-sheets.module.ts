import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleSheetsController } from './google-sheets.controller';
import { Integration } from '../../entities/integration.entity';
import { BroadcastModule } from '../broadcast/broadcast.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Integration]),
        ConfigModule,
        forwardRef(() => BroadcastModule),
    ],
    providers: [GoogleSheetsService],
    controllers: [GoogleSheetsController],
    exports: [GoogleSheetsService],
})
export class GoogleSheetsModule {}
