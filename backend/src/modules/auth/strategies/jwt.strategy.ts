import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                ExtractJwt.fromUrlQueryParameter('access_token'),
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('SUPABASE_JWT_SECRET'),
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
