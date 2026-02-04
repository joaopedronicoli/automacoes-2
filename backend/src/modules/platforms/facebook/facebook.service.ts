import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SocialPlatform } from '../../../entities/social-account.entity';

export interface FacebookPage {
    id: string;
    name: string;
    access_token: string;
    category: string;
    tasks?: string[];
    instagram_business_account?: {
        id: string;
    };
}

export interface FacebookPost {
    id: string;
    message?: string;
    story?: string;
    created_time: string;
    full_picture?: string;
    permalink_url: string;
    likes: {
        summary: {
            total_count: number;
        };
    };
    comments: {
        summary: {
            total_count: number;
        };
    };
    shares?: {
        count: number;
    };
}

export interface FacebookComment {
    id: string;
    from: {
        id: string;
        name: string;
    };
    message: string;
    created_time: string;
    can_reply: boolean;
}

export interface InstagramMedia {
    id: string;
    caption?: string;
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
    media_url: string;
    thumbnail_url?: string;
    permalink: string;
    timestamp: string;
    like_count: number;
    comments_count: number;
}

export interface InstagramComment {
    id: string;
    from: {
        id: string;
        username: string;
    };
    text: string;
    timestamp: string;
}

@Injectable()
export class FacebookService {
    private readonly logger = new Logger(FacebookService.name);
    private readonly graphApiUrl = 'https://graph.facebook.com/v18.0';
    private readonly axiosInstance: AxiosInstance;

    constructor(private configService: ConfigService) {
        this.axiosInstance = axios.create({
            baseURL: this.graphApiUrl,
            timeout: 30000,
        });
    }

    /**
     * Exchange authorization code for long-lived access token
     */
    async exchangeCodeForToken(code: string): Promise<string> {
        try {
            const response = await this.axiosInstance.get('/oauth/access_token', {
                params: {
                    client_id: this.configService.get('FACEBOOK_APP_ID'),
                    client_secret: this.configService.get('FACEBOOK_APP_SECRET'),
                    redirect_uri: this.configService.get('FACEBOOK_CALLBACK_URL'),
                    code,
                },
            });

            return response.data.access_token;
        } catch (error) {
            this.logger.error('Failed to exchange code for token', error);
            throw new Error('Failed to authenticate with Facebook');
        }
    }

    /**
     * Exchange short-lived token for long-lived token (60 days)
     */
    async getLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
        try {
            const response = await this.axiosInstance.get('/oauth/access_token', {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: this.configService.get('FACEBOOK_APP_ID'),
                    client_secret: this.configService.get('FACEBOOK_APP_SECRET'),
                    fb_exchange_token: shortLivedToken,
                },
            });

            return {
                access_token: response.data.access_token,
                expires_in: response.data.expires_in || 5184000, // 60 days default
            };
        } catch (error) {
            this.logger.error('Failed to get long-lived token', error);
            throw new Error('Failed to extend token lifetime');
        }
    }

    /**
     * Get user's Facebook Pages
     */
    async getUserPages(accessToken: string): Promise<FacebookPage[]> {
        try {
            const response = await this.axiosInstance.get('/me/accounts', {
                params: {
                    access_token: accessToken,
                    fields: 'id,name,access_token,category,tasks,instagram_business_account',
                },
            });

            return response.data.data || [];
        } catch (error) {
            this.logger.error('Failed to fetch user pages', error);
            throw new Error('Failed to fetch Facebook Pages');
        }
    }

    /**
     * Get Page posts with engagement metrics
     */
    async getPagePosts(
        pageId: string,
        accessToken: string,
        limit = 25,
        since?: Date,
    ): Promise<FacebookPost[]> {
        try {
            const params: any = {
                access_token: accessToken,
                fields: 'id,message,story,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares',
                limit,
            };

            if (since) {
                params.since = Math.floor(since.getTime() / 1000);
            }

            const response = await this.axiosInstance.get(`/${pageId}/posts`, { params });

            return response.data.data || [];
        } catch (error) {
            this.logger.error(`Failed to fetch posts for page ${pageId}`, error);
            throw new Error('Failed to fetch Facebook posts');
        }
    }

    /**
     * Get post comments
     */
    async getPostComments(
        postId: string,
        accessToken: string,
        limit = 100,
    ): Promise<FacebookComment[]> {
        try {
            const response = await this.axiosInstance.get(`/${postId}/comments`, {
                params: {
                    access_token: accessToken,
                    fields: 'id,from,message,created_time,can_reply',
                    limit,
                    order: 'reverse_chronological',
                },
            });

            return response.data.data || [];
        } catch (error) {
            this.logger.error(`Failed to fetch comments for post ${postId}`, error);
            return [];
        }
    }

    /**
     * Reply to a comment
     */
    async replyToComment(
        commentId: string,
        message: string,
        accessToken: string,
    ): Promise<{ id: string }> {
        try {
            const response = await this.axiosInstance.post(`/${commentId}/comments`, null, {
                params: {
                    access_token: accessToken,
                    message,
                },
            });

            this.logger.log(`Replied to comment ${commentId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to reply to comment ${commentId}`, error);
            throw new Error('Failed to post comment reply');
        }
    }

    /**
     * Send private message to user (requires messaging permissions)
     */
    async sendPrivateMessage(
        pageId: string,
        userId: string,
        message: string,
        accessToken: string,
    ): Promise<{ message_id: string }> {
        try {
            const response = await this.axiosInstance.post(`/${pageId}/messages`, null, {
                params: {
                    access_token: accessToken,
                    recipient: JSON.stringify({ id: userId }),
                    message: JSON.stringify({ text: message }),
                },
            });

            this.logger.log(`Sent DM to user ${userId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to send DM to user ${userId}`, error);
            throw new Error('Failed to send private message');
        }
    }

    // ========================================
    // INSTAGRAM BUSINESS API
    // ========================================

    /**
     * Get Instagram Business Account info
     */
    async getInstagramAccount(instagramBusinessAccountId: string, accessToken: string) {
        try {
            const response = await this.axiosInstance.get(`/${instagramBusinessAccountId}`, {
                params: {
                    access_token: accessToken,
                    fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count',
                },
            });

            return response.data;
        } catch (error) {
            this.logger.error('Failed to fetch Instagram account', error);
            throw new Error('Failed to fetch Instagram account');
        }
    }

    /**
     * Get Instagram media (posts)
     */
    async getInstagramMedia(
        instagramAccountId: string,
        accessToken: string,
        limit = 25,
    ): Promise<InstagramMedia[]> {
        try {
            const response = await this.axiosInstance.get(`/${instagramAccountId}/media`, {
                params: {
                    access_token: accessToken,
                    fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
                    limit,
                },
            });

            return response.data.data || [];
        } catch (error) {
            this.logger.error('Failed to fetch Instagram media', error);
            throw new Error('Failed to fetch Instagram media');
        }
    }

    /**
     * Get Instagram media comments
     */
    async getInstagramComments(
        mediaId: string,
        accessToken: string,
        limit = 100,
    ): Promise<InstagramComment[]> {
        try {
            const response = await this.axiosInstance.get(`/${mediaId}/comments`, {
                params: {
                    access_token: accessToken,
                    fields: 'id,from,text,timestamp',
                    limit,
                },
            });

            return response.data.data || [];
        } catch (error) {
            this.logger.error(`Failed to fetch Instagram comments for media ${mediaId}`, error);
            return [];
        }
    }

    /**
     * Reply to Instagram comment
     */
    async replyToInstagramComment(
        commentId: string,
        message: string,
        accessToken: string,
    ): Promise<{ id: string }> {
        try {
            const response = await this.axiosInstance.post(`/${commentId}/replies`, null, {
                params: {
                    access_token: accessToken,
                    message,
                },
            });

            this.logger.log(`Replied to Instagram comment ${commentId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to reply to Instagram comment ${commentId}`, error);
            throw new Error('Failed to reply to Instagram comment');
        }
    }

    /**
     * Send Instagram direct message
     */
    async sendInstagramMessage(
        instagramAccountId: string,
        recipientId: string,
        message: string,
        accessToken: string,
    ): Promise<{ id: string }> {
        try {
            const response = await this.axiosInstance.post(`/${instagramAccountId}/messages`, null, {
                params: {
                    access_token: accessToken,
                    recipient: JSON.stringify({ id: recipientId }),
                    message: JSON.stringify({ text: message }),
                },
            });

            this.logger.log(`Sent Instagram DM to ${recipientId}`);
            return response.data;
        } catch (error) {
            const errorData = error.response?.data || error.message;
            this.logger.error(`Failed to send Instagram DM to ${recipientId}: ${JSON.stringify(errorData)}`);
            throw new Error(`Failed to send Instagram message: ${JSON.stringify(errorData)}`);
        }
    }

    // ========================================
    // WEBHOOK VERIFICATION
    // ========================================

    /**
     * Verify Facebook webhook signature
     */
    verifyWebhookSignature(signature: string, payload: string): boolean {
        const crypto = require('crypto');
        const appSecret = this.configService.get('FACEBOOK_APP_SECRET');

        const expectedSignature = crypto
            .createHmac('sha256', appSecret)
            .update(payload)
            .digest('hex');

        return `sha256=${expectedSignature}` === signature;
    }

    /**
     * Subscribe app to page webhooks
     */
    async subscribeToPageWebhooks(pageId: string, accessToken: string): Promise<boolean> {
        try {
            await this.axiosInstance.post(`/${pageId}/subscribed_apps`, null, {
                params: {
                    access_token: accessToken,
                    subscribed_fields: 'feed,comments,mentions,messages',
                },
            });

            this.logger.log(`Subscribed to webhooks for page ${pageId}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to subscribe to webhooks for page ${pageId}`, error);
            return false;
        }
    }

    /**
     * Get user information
     */
    async getUserInfo(userId: string, accessToken: string) {
        try {
            const response = await this.axiosInstance.get(`/${userId}`, {
                params: {
                    access_token: accessToken,
                    fields: 'id,name,username,profile_pic,follower_count,is_verified_user',
                },
            });

            return response.data;
        } catch (error) {
            this.logger.error(`Failed to fetch user info for ${userId}`, error);
            return null;
        }
    }

    /**
     * Validate access token
     */
    async validateToken(accessToken: string): Promise<boolean> {
        try {
            const response = await this.axiosInstance.get('/me', {
                params: { access_token: accessToken },
            });

            return !!response.data.id;
        } catch (error) {
            this.logger.error('Token validation failed', error);
            return false;
        }
    }
}
