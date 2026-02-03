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
}

export interface BroadcastContact {
    name: string;
    phone: string;
    status?: 'pending' | 'sent' | 'failed';
    error?: string;
    messageId?: string;
    sentAt?: Date;
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
