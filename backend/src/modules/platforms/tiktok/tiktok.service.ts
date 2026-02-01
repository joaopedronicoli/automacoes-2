import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TiktokService {
    constructor(private configService: ConfigService) { }

    getAuthUrl(state: string): string {
        const clientKey = this.configService.get('TIKTOK_CLIENT_KEY');
        const redirectUri = `${this.configService.get('BACKEND_URL')}/auth/tiktok/callback`;
        const scope = 'user.info.basic,video.list';

        return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&response_type=code&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    }

    async getAccessToken(code: string) {
        const clientKey = this.configService.get('TIKTOK_CLIENT_KEY');
        const clientSecret = this.configService.get('TIKTOK_CLIENT_SECRET');
        const redirectUri = `${this.configService.get('BACKEND_URL')}/auth/tiktok/callback`;

        const params = new URLSearchParams();
        params.append('client_key', clientKey);
        params.append('client_secret', clientSecret);
        params.append('code', code);
        params.append('grant_type', 'authorization_code');
        params.append('redirect_uri', redirectUri);

        const res = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        return res.data; // { access_token, refresh_token, open_id, ... }
    }

    async getUserInfo(accessToken: string) {
        const res = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { fields: 'open_id,display_name,avatar_url' }
        });
        return res.data.data;
    }
}
