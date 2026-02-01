import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class YoutubeService {
    async getChannelDetails(accessToken: string) {
        const res = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
            params: {
                part: 'snippet,statistics',
                mine: true
            },
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        return res.data;
    }
}
