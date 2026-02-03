import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
    ChatwootContact,
    ChatwootConversation,
    ChatwootMessage,
    CreateContactDto,
    CreateConversationDto,
    CreateMessageDto,
} from './dto/chatwoot.dto';

@Injectable()
export class ChatwootService {
    private readonly logger = new Logger(ChatwootService.name);

    /**
     * Create axios instance for Chatwoot API
     */
    private createClient(baseUrl: string, accessToken: string): AxiosInstance {
        return axios.create({
            baseURL: `${baseUrl}/api/v1`,
            headers: {
                'api_access_token': accessToken,
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Test Chatwoot connection
     */
    async testConnection(baseUrl: string, accessToken: string): Promise<boolean> {
        try {
            const client = this.createClient(baseUrl, accessToken);
            const response = await client.get('/profile');
            return response.status === 200;
        } catch (error) {
            this.logger.error('Failed to test Chatwoot connection', error);
            return false;
        }
    }

    /**
     * Find contact by phone number
     */
    async findContactByPhone(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        phoneNumber: string,
    ): Promise<ChatwootContact | null> {
        try {
            const client = this.createClient(baseUrl, accessToken);

            // Clean phone number (remove non-digits and add + if needed)
            const cleanPhone = phoneNumber.startsWith('+')
                ? phoneNumber
                : `+${phoneNumber.replace(/\D/g, '')}`;

            const response = await client.get(`/accounts/${accountId}/contacts/search`, {
                params: { q: cleanPhone },
            });

            const contacts = response.data.payload || [];

            // Find exact match by phone number
            const contact = contacts.find((c: ChatwootContact) =>
                c.phone_number === cleanPhone || c.phone_number === phoneNumber
            );

            return contact || null;
        } catch (error) {
            this.logger.error(`Failed to find contact by phone ${phoneNumber}`, error);
            return null;
        }
    }

    /**
     * Create contact in Chatwoot
     */
    async createContact(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        data: CreateContactDto,
    ): Promise<ChatwootContact> {
        try {
            const client = this.createClient(baseUrl, accessToken);

            // Clean phone number
            const cleanPhone = data.phone_number.startsWith('+')
                ? data.phone_number
                : `+${data.phone_number.replace(/\D/g, '')}`;

            const response = await client.post(`/accounts/${accountId}/contacts`, {
                name: data.name,
                phone_number: cleanPhone,
                email: data.email || undefined,
                identifier: data.identifier || cleanPhone,
            });

            this.logger.log(`Created Chatwoot contact: ${response.data.payload.name}`);
            return response.data.payload;
        } catch (error) {
            this.logger.error('Failed to create Chatwoot contact', error);
            throw error;
        }
    }

    /**
     * Find or create contact
     */
    async findOrCreateContact(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        data: CreateContactDto,
    ): Promise<ChatwootContact> {
        // Try to find existing contact
        const existingContact = await this.findContactByPhone(
            baseUrl,
            accessToken,
            accountId,
            data.phone_number,
        );

        if (existingContact) {
            this.logger.log(`Found existing Chatwoot contact: ${existingContact.name}`);
            return existingContact;
        }

        // Create new contact
        return this.createContact(baseUrl, accessToken, accountId, data);
    }

    /**
     * Find active conversation for contact in inbox
     */
    async findActiveConversation(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        contactId: number,
        inboxId: number,
    ): Promise<ChatwootConversation | null> {
        try {
            const client = this.createClient(baseUrl, accessToken);

            const response = await client.get(`/accounts/${accountId}/conversations`, {
                params: {
                    inbox_id: inboxId,
                    status: 'open',
                },
            });

            const conversations = response.data.data.payload || [];

            // Find conversation for this contact
            const conversation = conversations.find((conv: any) =>
                conv.meta?.sender?.id === contactId
            );

            return conversation || null;
        } catch (error) {
            this.logger.error('Failed to find active conversation', error);
            return null;
        }
    }

    /**
     * Create conversation in Chatwoot
     */
    async createConversation(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        data: CreateConversationDto,
    ): Promise<ChatwootConversation> {
        try {
            const client = this.createClient(baseUrl, accessToken);

            const response = await client.post(`/accounts/${accountId}/conversations`, {
                source_id: `${data.contact_id}`,
                inbox_id: data.inbox_id,
                contact_id: data.contact_id,
                status: data.status || 'open',
            });

            this.logger.log(`Created Chatwoot conversation: ${response.data.id}`);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to create Chatwoot conversation', error);
            throw error;
        }
    }

    /**
     * Find or create conversation
     */
    async findOrCreateConversation(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        contactId: number,
        inboxId: number,
    ): Promise<ChatwootConversation> {
        // Try to find active conversation
        const existingConv = await this.findActiveConversation(
            baseUrl,
            accessToken,
            accountId,
            contactId,
            inboxId,
        );

        if (existingConv) {
            this.logger.log(`Found existing Chatwoot conversation: ${existingConv.id}`);
            return existingConv;
        }

        // Create new conversation
        return this.createConversation(baseUrl, accessToken, accountId, {
            inbox_id: inboxId,
            contact_id: contactId,
            status: 'open',
        });
    }

    /**
     * Create message in conversation
     */
    async createMessage(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        conversationId: number,
        content: string,
    ): Promise<ChatwootMessage> {
        try {
            const client = this.createClient(baseUrl, accessToken);

            const response = await client.post(
                `/accounts/${accountId}/conversations/${conversationId}/messages`,
                {
                    content,
                    message_type: 'outgoing',
                    private: false,
                },
            );

            this.logger.log(`Created Chatwoot message in conversation ${conversationId}`);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to create Chatwoot message', error);
            throw error;
        }
    }

    /**
     * Register broadcast message in Chatwoot
     * This is the main method used by broadcast processor
     */
    async registerBroadcastMessage(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        inboxId: number,
        contactData: CreateContactDto,
        messageContent: string,
    ): Promise<void> {
        try {
            // Step 1: Find or create contact
            const contact = await this.findOrCreateContact(
                baseUrl,
                accessToken,
                accountId,
                contactData,
            );

            // Step 2: Find or create conversation
            const conversation = await this.findOrCreateConversation(
                baseUrl,
                accessToken,
                accountId,
                contact.id,
                inboxId,
            );

            // Step 3: Create message
            await this.createMessage(
                baseUrl,
                accessToken,
                accountId,
                conversation.id,
                messageContent,
            );

            this.logger.log(
                `Successfully registered broadcast message for contact ${contact.name} in Chatwoot`,
            );
        } catch (error) {
            this.logger.error('Failed to register broadcast message in Chatwoot', error);
            // Don't throw - we don't want to fail the broadcast if Chatwoot fails
        }
    }
}
