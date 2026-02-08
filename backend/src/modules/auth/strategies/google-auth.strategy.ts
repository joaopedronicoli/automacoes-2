import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAuthStrategy extends PassportStrategy(Strategy, 'google-auth') {
    private readonly logger = new Logger('GoogleAuthStrategy');

    constructor(private configService: ConfigService) {
        const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
        const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') ||
            (configService.get<string>('BACKEND_URL') + '/auth/google/callback');

        super({
            clientID,
            clientSecret,
            callbackURL,
            scope: ['email', 'profile'],
        });

        // Debug log — remover depois de confirmar
        console.log('[GoogleAuth] clientID:', clientID ? `${clientID.substring(0, 15)}...` : 'UNDEFINED');
        console.log('[GoogleAuth] clientSecret:', clientSecret ? 'SET' : 'UNDEFINED');
        console.log('[GoogleAuth] callbackURL:', callbackURL);
        console.log('[GoogleAuth] GOOGLE_CALLBACK_URL env:', configService.get<string>('GOOGLE_CALLBACK_URL') || 'NOT SET');
        console.log('[GoogleAuth] BACKEND_URL env:', configService.get<string>('BACKEND_URL') || 'NOT SET');
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
        const { name, emails, photos, id } = profile;
        const user = {
            email: emails[0].value,
            name: `${name.givenName || ''} ${name.familyName || ''}`.trim(),
            picture: photos?.[0]?.value || null,
            googleId: id,
        };
        done(null, user);
    }
}
