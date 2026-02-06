import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
    ChatwootContact,
    ChatwootConversation,
    ChatwootMessage,
    CreateContactDto,
    CreateConversationDto,
    CreateMessageDto,
    CreateContactByIdentifierDto,
    CreateConversationWithAttributesDto,
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

            const contact = response.data.payload?.contact || response.data.payload || response.data;
            this.logger.log(`Created Chatwoot contact: ${contact.name} (id: ${contact.id})`);
            return contact;
        } catch (error) {
            // If contact already exists (422), try to find it
            if (error.response?.status === 422) {
                this.logger.warn(`Contact already exists for phone ${data.phone_number}, trying to find...`);
                const existing = await this.findContactByPhone(baseUrl, accessToken, accountId, data.phone_number);
                if (existing) return existing;
            }
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
        // Try to find any conversation (including resolved)
        const existingConv = await this.findConversationForContact(
            baseUrl,
            accessToken,
            accountId,
            contactId,
            inboxId,
        );

        if (existingConv) {
            // If conversation is resolved, reopen it
            if (existingConv.status === 'resolved') {
                this.logger.log(`Reopening resolved conversation ${existingConv.id}`);
                await this.reopenConversation(baseUrl, accessToken, accountId, existingConv.id);
                existingConv.status = 'open';
            }
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
                    private: true,  // Nota privada para registro interno
                },
            );

            this.logger.log(`Created Chatwoot message in conversation ${conversationId}`);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to create Chatwoot message', error);
            throw error;
        }
    }

    // ========================================
    // INSTAGRAM DM BRIDGE METHODS
    // ========================================

    /**
     * Find contact by identifier (e.g. Instagram IGSID)
     */
    async findContactByIdentifier(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        identifier: string,
    ): Promise<ChatwootContact | null> {
        try {
            const client = this.createClient(baseUrl, accessToken);
            const response = await client.get(`/accounts/${accountId}/contacts/search`, {
                params: { q: identifier },
            });

            const contacts = response.data.payload || [];
            return contacts.find((c: ChatwootContact) => c.identifier === identifier) || null;
        } catch (error) {
            this.logger.error(`Failed to find contact by identifier ${identifier}`, error);
            return null;
        }
    }

    /**
     * Create contact by identifier (for Instagram users)
     */
    async createContactByIdentifier(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        data: CreateContactByIdentifierDto,
    ): Promise<ChatwootContact> {
        try {
            const client = this.createClient(baseUrl, accessToken);
            const response = await client.post(`/accounts/${accountId}/contacts`, {
                name: data.name,
                identifier: data.identifier,
                avatar_url: data.avatar_url || undefined,
                phone_number: data.phone_number || undefined,
                email: data.email || undefined,
            });

            this.logger.log(`Created Chatwoot contact by identifier: ${data.name} (${data.identifier})`);
            return response.data.payload?.contact || response.data.payload || response.data;
        } catch (error) {
            // If already exists (422), try to find it
            if (error.response?.status === 422) {
                const existing = await this.findContactByIdentifier(baseUrl, accessToken, accountId, data.identifier);
                if (existing) return existing;
            }
            this.logger.error('Failed to create Chatwoot contact by identifier', error);
            throw error;
        }
    }

    /**
     * Find or create contact by identifier
     */
    async findOrCreateContactByIdentifier(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        data: CreateContactByIdentifierDto,
    ): Promise<ChatwootContact> {
        const existing = await this.findContactByIdentifier(baseUrl, accessToken, accountId, data.identifier);
        if (existing) {
            this.logger.log(`Found existing contact by identifier: ${existing.name}`);
            return existing;
        }
        return this.createContactByIdentifier(baseUrl, accessToken, accountId, data);
    }

    /**
     * Find any conversation for a contact in a specific inbox (including resolved)
     */
    async findConversationForContact(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        contactId: number,
        inboxId: number,
    ): Promise<ChatwootConversation | null> {
        try {
            const client = this.createClient(baseUrl, accessToken);
            const response = await client.get(`/accounts/${accountId}/contacts/${contactId}/conversations`);
            const conversations = response.data?.payload || [];

            this.logger.log(`Found ${conversations.length} conversations for contact ${contactId}`);

            // First try to find an open conversation
            const openConv = conversations.find(
                (c: any) => c.inbox_id === inboxId && c.status !== 'resolved',
            );
            if (openConv) {
                this.logger.log(`Found open conversation ${openConv.id} in inbox ${inboxId}`);
                return openConv;
            }

            // If no open conversation, find any conversation in this inbox (including resolved)
            const anyConv = conversations.find((c: any) => c.inbox_id === inboxId);
            if (anyConv) {
                this.logger.log(`Found resolved conversation ${anyConv.id} in inbox ${inboxId}, will reopen`);
                return anyConv;
            }

            this.logger.log(`No conversation found for contact ${contactId} in inbox ${inboxId}`);
            return null;
        } catch (error) {
            this.logger.error('Failed to find conversation for contact', error);
            return null;
        }
    }

    /**
     * Reopen a resolved conversation
     */
    async reopenConversation(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        conversationId: number,
    ): Promise<void> {
        try {
            const client = this.createClient(baseUrl, accessToken);
            await client.post(`/accounts/${accountId}/conversations/${conversationId}/toggle_status`, {
                status: 'open',
            });
            this.logger.log(`Reopened conversation ${conversationId}`);
        } catch (error) {
            this.logger.error(`Failed to reopen conversation ${conversationId}`, error);
            throw error;
        }
    }

    /**
     * Create conversation with additional_attributes (to store instagram_account_id)
     */
    async createConversationWithAttributes(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        data: CreateConversationWithAttributesDto,
    ): Promise<ChatwootConversation> {
        try {
            const client = this.createClient(baseUrl, accessToken);
            const response = await client.post(`/accounts/${accountId}/conversations`, {
                inbox_id: data.inbox_id,
                contact_id: data.contact_id,
                status: data.status || 'open',
                additional_attributes: data.additional_attributes || {},
            });

            this.logger.log(`Created Chatwoot conversation with attributes: ${response.data.id}`);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to create conversation with attributes', error);
            throw error;
        }
    }

    /**
     * Find or create conversation for Instagram contact
     */
    async findOrCreateInstagramConversation(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        contactId: number,
        inboxId: number,
        instagramAccountId: string,
    ): Promise<ChatwootConversation> {
        // First, try to find any existing conversation (including resolved)
        const existing = await this.findConversationForContact(
            baseUrl, accessToken, accountId, contactId, inboxId,
        );

        if (existing) {
            // If conversation is resolved, reopen it
            if (existing.status === 'resolved') {
                this.logger.log(`Reopening resolved conversation ${existing.id}`);
                await this.reopenConversation(baseUrl, accessToken, accountId, existing.id);
                existing.status = 'open';
            }
            this.logger.log(`Using existing conversation: ${existing.id}`);
            return existing;
        }

        // Only create new conversation if none exists
        this.logger.log(`No existing conversation found, creating new one for contact ${contactId} in inbox ${inboxId}`);
        return this.createConversationWithAttributes(baseUrl, accessToken, accountId, {
            inbox_id: inboxId,
            contact_id: contactId,
            status: 'open',
            additional_attributes: {
                instagram_account_id: instagramAccountId,
            },
        });
    }

    /**
     * Create incoming message in conversation (from customer)
     */
    async createIncomingMessage(
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
                    message_type: 'incoming',
                    private: false,
                },
            );

            this.logger.log(`Created incoming message in conversation ${conversationId}`);
            return response.data;
        } catch (error) {
            this.logger.error('Failed to create incoming message', error);
            throw error;
        }
    }

    /**
     * Get contact by ID
     */
    async getContactById(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        contactId: number,
    ): Promise<ChatwootContact | null> {
        try {
            const client = this.createClient(baseUrl, accessToken);
            const response = await client.get(`/accounts/${accountId}/contacts/${contactId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to get contact ${contactId}`, error);
            return null;
        }
    }

    /**
     * Update contact with additional data
     */
    async updateContact(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        contactId: number,
        data: {
            name?: string;
            avatar_url?: string;
            custom_attributes?: Record<string, any>;
        },
    ): Promise<void> {
        try {
            const client = this.createClient(baseUrl, accessToken);
            await client.put(`/accounts/${accountId}/contacts/${contactId}`, data);
            this.logger.log(`Updated Chatwoot contact ${contactId} with Instagram data`);
        } catch (error) {
            this.logger.error(`Failed to update contact ${contactId}`, error);
            throw error;
        }
    }

    /**
     * Get conversation by ID
     */
    async getConversationById(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        conversationId: number,
    ): Promise<any | null> {
        try {
            const client = this.createClient(baseUrl, accessToken);
            const response = await client.get(`/accounts/${accountId}/conversations/${conversationId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to get conversation ${conversationId}`, error);
            return null;
        }
    }

    // ========================================
    // LABELS (TAGS) METHODS
    // ========================================

    /**
     * Get all labels for an account
     */
    async getLabels(
        baseUrl: string,
        accessToken: string,
        accountId: number,
    ): Promise<Array<{ id: number; title: string; color: string }>> {
        try {
            const client = this.createClient(baseUrl, accessToken);
            const response = await client.get(`/accounts/${accountId}/labels`);
            return response.data.payload || response.data || [];
        } catch (error) {
            this.logger.error('Failed to get labels', error);
            return [];
        }
    }

    /**
     * Add labels to a conversation
     */
    async addLabelsToConversation(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        conversationId: number,
        labels: string[],
    ): Promise<void> {
        try {
            const client = this.createClient(baseUrl, accessToken);
            await client.post(`/accounts/${accountId}/conversations/${conversationId}/labels`, {
                labels,
            });
            this.logger.log(`Added labels to conversation ${conversationId}: ${labels.join(', ')}`);
        } catch (error) {
            this.logger.error(`Failed to add labels to conversation ${conversationId}`, error);
            throw error;
        }
    }

    /**
     * Add labels to a contact
     */
    async addLabelsToContact(
        baseUrl: string,
        accessToken: string,
        accountId: number,
        contactId: number,
        labels: string[],
    ): Promise<void> {
        try {
            const client = this.createClient(baseUrl, accessToken);
            // Chatwoot uses custom_attributes for contact labels
            const contact = await this.getContactById(baseUrl, accessToken, accountId, contactId);
            const existingLabels = contact?.custom_attributes?.labels || [];
            const newLabels = [...new Set([...existingLabels, ...labels])];

            await client.put(`/accounts/${accountId}/contacts/${contactId}`, {
                custom_attributes: {
                    ...contact?.custom_attributes,
                    labels: newLabels,
                },
            });
            this.logger.log(`Added labels to contact ${contactId}: ${labels.join(', ')}`);
        } catch (error) {
            this.logger.error(`Failed to add labels to contact ${contactId}`, error);
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
