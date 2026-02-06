export interface VariableMapping {
    variableIndex: number; // 1, 2, 3...
    componentType: 'HEADER' | 'BODY' | 'BUTTON';
    source: 'csv' | 'manual';
    csvColumn?: string;
    manualValue?: string;
}

export interface CreateBroadcastDto {
    name: string;
    wabaId: string;
    phoneNumberId: string;
    templateName: string;
    templateLanguage: string;
    mode: 'bulk' | 'single';
    contacts?: BroadcastContact[];
    singleRecipient?: { phone: string; name: string };
    variableMappings: VariableMapping[];
    csvColumns?: string[];
    // New scheduling fields
    scheduledAt?: string;  // ISO date string
    timezone?: string;
    timeWindowStart?: string;  // "07:00"
    timeWindowEnd?: string;    // "21:00"
    enableDeduplication?: boolean;
    // Chatwoot integration
    chatwootIntegrationId?: string;
    // Chatwoot tags
    conversationTags?: string[];
    contactTags?: string[];
    // Template category (MARKETING, UTILITY, AUTHENTICATION)
    templateCategory?: string;
    // Media header support
    headerMediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    headerMediaUrl?: string;
}

// Chatwoot contact check DTO
export interface CheckChatwootContactsDto {
    chatwootIntegrationId: string;
    contacts: Array<{ name: string; phone: string }>;
}

export interface BroadcastContact {
    name: string;
    phone: string;
    status?: 'pending' | 'sent' | 'failed' | 'skipped';
    error?: string;
    messageId?: string;
    sentAt?: Date;
    retryAttempts?: number;
    chatwootContactId?: number;
    chatwootSyncStatus?: 'synced' | 'missing' | 'created' | 'error';
    chatwootError?: string;
    [key: string]: any; // Dynamic fields from CSV
}

export interface ParsedCSVResult {
    contacts: BroadcastContact[];
    errors: string[];
    totalRows: number;
    validRows: number;
    detectedColumns: string[];
    columnMapping: { [key: string]: number };
}

// Template Preview DTOs
export interface TemplatePreviewDto {
    templateName: string;
    templateLanguage: string;
    wabaId: string;
    variableMappings: VariableMapping[];
    sampleContact?: BroadcastContact;
}

export interface PreviewResult {
    headerText?: string;
    bodyText: string;
    footerText?: string;
    buttons?: Array<{ type: string; text: string; url?: string }>;
}

// Chatwoot Sync DTOs
export interface ChatwootSyncResult {
    synced: number;
    missing: number;
    created: number;
    errors: number;
    errorDetails: Array<{ phone: string; error: string }>;
    contacts: BroadcastContact[];
}

// Deduplication DTOs
export interface DuplicateCheckResult {
    duplicateCount: number;
    uniqueCount: number;
    duplicatePhones: string[];
}

// Analytics DTOs
export interface AnalyticsFilters {
    startDate?: string;
    endDate?: string;
    status?: string;
}

export interface AnalyticsResult {
    totalBroadcasts: number;
    totalSent: number;
    totalFailed: number;
    totalSkipped: number;
    successRate: number;
    byStatus: { [key: string]: number };
    recentBroadcasts: Array<{
        id: string;
        name: string;
        status: string;
        sentCount: number;
        failedCount: number;
        createdAt: string;
    }>;
}
