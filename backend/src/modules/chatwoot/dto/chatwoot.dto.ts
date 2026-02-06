export interface CreateChatwootIntegrationDto {
    name: string;
    chatwootUrl: string;
    accessToken: string;
    inboxId?: number;
    accountId?: number;
}

export interface ChatwootContact {
    id: number;
    name: string;
    phone_number?: string;
    email?: string;
    identifier?: string;
    thumbnail?: string;
    custom_attributes?: Record<string, any>;
}

export interface ChatwootConversation {
    id: number;
    inbox_id: number;
    contact_id: number;
    status: 'open' | 'resolved' | 'pending';
    messages: ChatwootMessage[];
}

export interface ChatwootMessage {
    id: number;
    content: string;
    message_type: 'incoming' | 'outgoing';
    created_at: number;
    conversation_id: number;
    sender?: {
        id: number;
        name: string;
        type: 'contact' | 'user';
    };
}

export interface CreateContactDto {
    name: string;
    phone_number: string;
    email?: string;
    identifier?: string;
}

export interface CreateConversationDto {
    inbox_id: number;
    contact_id: number;
    status?: 'open' | 'pending';
}

export interface CreateMessageDto {
    conversation_id: number;
    content: string;
    message_type: 'outgoing' | 'incoming';
    private?: boolean;
}

export interface CreateContactByIdentifierDto {
    name: string;
    identifier: string;
    avatar_url?: string;
    phone_number?: string;
    email?: string;
}

export interface CreateConversationWithAttributesDto {
    inbox_id: number;
    contact_id: number;
    status?: 'open' | 'pending';
    additional_attributes?: Record<string, any>;
}
