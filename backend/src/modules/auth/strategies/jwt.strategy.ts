import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        const supabaseUrl = configService.get<string>('SUPABASE_URL');
        const jwksUri = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;

        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                ExtractJwt.fromUrlQueryParameter('access_token'),
            ]),
            ignoreExpiration: false,
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: jwksUri,
            }),
            algorithms: ['ES256'],
        });
    }

    async validate(payload: any) {
        // Supabase JWT payload has 'sub' as user UUID and 'email'
        return {
            userId: payload.sub,
            email: payload.email,
        };
    }
}
