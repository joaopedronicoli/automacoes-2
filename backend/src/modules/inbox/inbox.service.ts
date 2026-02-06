import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from '../../entities/conversation.entity';
import { Message, MessageDirection, MessageStatus, MessageType } from '../../entities/message.entity';
import { FacebookService } from '../platforms/facebook/facebook.service';
import { SocialAccountsService } from '../social-accounts/social-accounts.service';
import { SocialPlatform } from '../../entities/social-account.entity';

@Injectable()
export class InboxService {
    private readonly logger = new Logger(InboxService.name);

    constructor(
        @InjectRepository(Conversation)
        private conversationRepository: Repository<Conversation>,
        @InjectRepository(Message)
        private messageRepository: Repository<Message>,
        private facebookService: FacebookService,
        private socialAccountsService: SocialAccountsService,
    ) {}

    /**
     * Get all conversations for a user
     */
    async getConversations(userId: string, status?: ConversationStatus): Promise<Conversation[]> {
        const where: any = { userId };
        if (status) {
            where.status = status;
        }

        return this.conversationRepository.find({
            where,
            order: { lastMessageAt: 'DESC' },
            relations: ['socialAccount'],
        });
    }

    /**
     * Get a single conversation by ID
     */
    async getConversation(conversationId: string, userId: string): Promise<Conversation> {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId, userId },
            relations: ['socialAccount'],
        });

        if (!conversation) {
            throw new NotFoundException('Conversa não encontrada');
        }

        return conversation;
    }

    /**
     * Get messages for a conversation
     */
    async getMessages(conversationId: string, userId: string, limit = 50, offset = 0): Promise<Message[]> {
        // Verify conversation belongs to user
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId, userId },
        });

        if (!conversation) {
            throw new NotFoundException('Conversa não encontrada');
        }

        return this.messageRepository.find({
            where: { conversationId },
            order: { createdAt: 'ASC' },
            take: limit,
            skip: offset,
        });
    }

    /**
     * Send a message in a conversation
     */
    async sendMessage(conversationId: string, userId: string, content: string): Promise<Message> {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId, userId },
            relations: ['socialAccount'],
        });

        if (!conversation) {
            throw new NotFoundException('Conversa não encontrada');
        }

        // Get fresh social account with token
        const socialAccount = await this.socialAccountsService.findById(conversation.socialAccountId);
        if (!socialAccount) {
            throw new NotFoundException('Conta social não encontrada');
        }

        // Send via Instagram API
        const linkedPageId = socialAccount.metadata?.linked_page_id;

        await this.facebookService.sendInstagramMessage(
            socialAccount.accountId,
            conversation.participantId,
            content,
            socialAccount.accessToken,
            linkedPageId,
        );

        // Save message to database
        const message = this.messageRepository.create({
            conversationId,
            direction: MessageDirection.OUTGOING,
            type: MessageType.TEXT,
            content,
            status: MessageStatus.SENT,
            senderId: socialAccount.accountId,
        });

        const savedMessage = await this.messageRepository.save(message);

        // Update conversation
        conversation.lastMessage = content.length > 100 ? content.substring(0, 100) + '...' : content;
        conversation.lastMessageAt = new Date();
        conversation.status = ConversationStatus.OPEN;
        await this.conversationRepository.save(conversation);

        this.logger.log(`Message sent in conversation ${conversationId}`);

        return savedMessage;
    }

    /**
     * Handle incoming Instagram message - called by webhook processor
     */
    async handleIncomingMessage(data: {
        instagramAccountId: string;
        senderId: string;
        senderName?: string;
        senderUsername?: string;
        senderAvatar?: string;
        message: string;
        messageId?: string;
        timestamp: number;
        messageType?: MessageType;
        mediaUrl?: string;
    }): Promise<{ conversation: Conversation; message: Message }> {
        const { instagramAccountId, senderId, message, messageId, timestamp } = data;

        // Find the social account
        const socialAccount = await this.socialAccountsService.findByPlatformAndId(
            SocialPlatform.INSTAGRAM,
            instagramAccountId,
        );

        if (!socialAccount) {
            throw new NotFoundException(`Social account not found for Instagram ${instagramAccountId}`);
        }

        // Find or create conversation
        let conversation = await this.conversationRepository.findOne({
            where: {
                socialAccountId: socialAccount.id,
                participantId: senderId,
            },
        });

        if (!conversation) {
            // Get sender profile from Instagram
            let senderName = data.senderName || `Instagram User ${senderId}`;
            let senderUsername = data.senderUsername;
            let senderAvatar = data.senderAvatar;
            let followerCount: number | undefined;
            let isVerified = false;

            try {
                const profile = await this.facebookService.getUserInfo(senderId, socialAccount.accessToken);
                if (profile) {
                    senderName = profile.name || profile.username || senderName;
                    senderUsername = profile.username || senderUsername;
                    senderAvatar = profile.profile_pic || senderAvatar;
                    followerCount = profile.follower_count;
                    isVerified = profile.is_verified_user || false;
                }
            } catch (error) {
                this.logger.warn(`Could not fetch Instagram profile for ${senderId}`);
            }

            conversation = this.conversationRepository.create({
                userId: socialAccount.userId,
                socialAccountId: socialAccount.id,
                participantId: senderId,
                participantName: senderName,
                participantUsername: senderUsername,
                participantAvatar: senderAvatar,
                participantFollowers: followerCount,
                participantVerified: isVerified,
                status: ConversationStatus.OPEN,
                unreadCount: 1,
                lastMessage: message?.length > 100 ? message.substring(0, 100) + '...' : message,
                lastMessageAt: new Date(timestamp),
            });

            conversation = await this.conversationRepository.save(conversation);
            this.logger.log(`Created new conversation ${conversation.id} for participant ${senderId}`);
        } else {
            // Update existing conversation
            conversation.lastMessage = message?.length > 100 ? message.substring(0, 100) + '...' : message;
            conversation.lastMessageAt = new Date(timestamp);
            conversation.unreadCount += 1;
            conversation.status = ConversationStatus.OPEN;

            // Update participant info if provided
            if (data.senderName) conversation.participantName = data.senderName;
            if (data.senderUsername) conversation.participantUsername = data.senderUsername;
            if (data.senderAvatar) conversation.participantAvatar = data.senderAvatar;

            await this.conversationRepository.save(conversation);
        }

        // Check for duplicate message
        if (messageId) {
            const existingMessage = await this.messageRepository.findOne({
                where: { externalId: messageId },
            });
            if (existingMessage) {
                this.logger.log(`Duplicate message ${messageId} ignored`);
                return { conversation, message: existingMessage };
            }
        }

        // Create message
        const newMessage = this.messageRepository.create({
            conversationId: conversation.id,
            externalId: messageId,
            direction: MessageDirection.INCOMING,
            type: data.messageType || MessageType.TEXT,
            content: message,
            mediaUrl: data.mediaUrl,
            status: MessageStatus.DELIVERED,
            senderId: senderId,
            senderName: conversation.participantName,
            instagramTimestamp: new Date(timestamp),
        });

        const savedMessage = await this.messageRepository.save(newMessage);
        this.logger.log(`Saved incoming message ${savedMessage.id} in conversation ${conversation.id}`);

        return { conversation, message: savedMessage };
    }

    /**
     * Mark conversation as read
     */
    async markAsRead(conversationId: string, userId: string): Promise<void> {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId, userId },
        });

        if (conversation) {
            conversation.unreadCount = 0;
            await this.conversationRepository.save(conversation);
        }
    }

    /**
     * Update conversation status
     */
    async updateStatus(conversationId: string, userId: string, status: ConversationStatus): Promise<Conversation> {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId, userId },
        });

        if (!conversation) {
            throw new NotFoundException('Conversa não encontrada');
        }

        conversation.status = status;
        return this.conversationRepository.save(conversation);
    }

    /**
     * Get unread count for user
     */
    async getUnreadCount(userId: string): Promise<number> {
        const result = await this.conversationRepository
            .createQueryBuilder('c')
            .select('SUM(c.unread_count)', 'total')
            .where('c.user_id = :userId', { userId })
            .getRawOne();

        return parseInt(result?.total || '0', 10);
    }
}
