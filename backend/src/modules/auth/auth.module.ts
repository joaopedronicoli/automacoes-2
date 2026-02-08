import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { WhatsAppOtpService } from './services/whatsapp-otp.service';
import { EmailService } from './services/email.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PlansModule } from '../plans/plans.module';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';

@Module({
    imports: [
        UsersModule,
        PlansModule,
        PassportModule,
        ConfigModule,
        forwardRef(() => GoogleSheetsModule),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '24h' },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, WhatsAppOtpService, EmailService],
    exports: [JwtModule],
})
export class AuthModule {}
