import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface WhatsAppBusiness {
    id: string;
    name: string;
}

export interface WABA {
    id: string;
    name: string;
    currency: string;
    timezone_id: string;
    message_template_namespace: string;
}

export interface PhoneNumber {
    id: string;
    display_phone_number: string;
    verified_name: string;
    quality_rating: string;
    status: string;
}

export interface MessageTemplate {
    id: string;
    name: string;
    language: string;
    status: string;
    category: string;
    components: TemplateComponent[];
}

export interface TemplateComponent {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    text?: string;
    example?: {
        header_text?: string[];
        body_text?: string[][];
    };
    buttons?: Array<{
        type: string;
        text: string;
        url?: string;
        phone_number?: string;
    }>;
}

export interface SendTemplateParams {
    phoneNumberId: string;
    to: string;
    templateName: string;
    languageCode: string;
    components?: any[];
    accessToken: string;
}

@Injectable()
export class WhatsAppService {
    private readonly logger = new Logger(WhatsAppService.name);
    private readonly graphApiUrl = 'https://graph.facebook.com/v18.0';
    private readonly axiosInstance: AxiosInstance;

    constructor(private configService: ConfigService) {
        this.axiosInstance = axios.create({
            baseURL: this.graphApiUrl,
            timeout: 30000,
        });
    }

    /**
     * Get user's businesses
     */
    async getUserBusinesses(accessToken: string): Promise<WhatsAppBusiness[]> {
        try {
            const response = await this.axiosInstance.get('/me/businesses', {
                params: {
                    access_token: accessToken,
                    fields: 'id,name',
                },
            });

            return response.data.data || [];
        } catch (error) {
            this.logger.error('Failed to fetch user businesses', error?.response?.data || error);
            throw new Error('Failed to fetch businesses');
        }
    }

    /**
     * Get WhatsApp Business Accounts (WABAs) owned by a business
     */
    async getWABAs(businessId: string, accessToken: string): Promise<WABA[]> {
        try {
            const response = await this.axiosInstance.get(`/${businessId}/owned_whatsapp_business_accounts`, {
                params: {
                    access_token: accessToken,
                    fields: 'id,name,currency,timezone_id,message_template_namespace',
                },
            });

            return response.data.data || [];
        } catch (error) {
            this.logger.error(`Failed to fetch WABAs for business ${businessId}`, error?.response?.data || error);
            throw new Error('Failed to fetch WhatsApp Business Accounts');
        }
    }

    /**
     * Get all WABAs for a user (across all businesses)
     */
    async getAllUserWABAs(accessToken: string): Promise<WABA[]> {
        try {
            const businesses = await this.getUserBusinesses(accessToken);
            const allWABAs: WABA[] = [];

            for (const business of businesses) {
                try {
                    const wabas = await this.getWABAs(business.id, accessToken);
                    allWABAs.push(...wabas);
                } catch (err) {
                    this.logger.warn(`Failed to fetch WABAs for business ${business.id}`, err);
                }
            }

            return allWABAs;
        } catch (error) {
            this.logger.error('Failed to fetch all user WABAs', error);
            throw new Error('Failed to fetch WhatsApp Business Accounts');
        }
    }

    /**
     * Get phone numbers for a WABA
     */
    async getPhoneNumbers(wabaId: string, accessToken: string): Promise<PhoneNumber[]> {
        try {
            const response = await this.axiosInstance.get(`/${wabaId}/phone_numbers`, {
                params: {
                    access_token: accessToken,
                    fields: 'id,display_phone_number,verified_name,quality_rating,status',
                },
            });

            return response.data.data || [];
        } catch (error) {
            this.logger.error(`Failed to fetch phone numbers for WABA ${wabaId}`, error?.response?.data || error);
            throw new Error('Failed to fetch phone numbers');
        }
    }

    /**
     * Get approved message templates for a WABA
     */
    async getTemplates(wabaId: string, accessToken: string, status: string = 'APPROVED'): Promise<MessageTemplate[]> {
        try {
            const response = await this.axiosInstance.get(`/${wabaId}/message_templates`, {
                params: {
                    access_token: accessToken,
                    fields: 'id,name,language,status,category,components',
                    status,
                },
            });

            return response.data.data || [];
        } catch (error) {
            this.logger.error(`Failed to fetch templates for WABA ${wabaId}`, error?.response?.data || error);
            throw new Error('Failed to fetch message templates');
        }
    }

    /**
     * Send a template message
     */
    async sendTemplate(params: SendTemplateParams): Promise<{ messaging_product: string; contacts: any[]; messages: any[] }> {
        const { phoneNumberId, to, templateName, languageCode, components, accessToken } = params;

        try {
            // Format phone number (remove non-digits, ensure country code)
            const formattedPhone = this.formatPhoneNumber(to);

            const payload: any = {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'template',
                template: {
                    name: templateName,
                    language: {
                        code: languageCode,
                    },
                },
            };

            if (components && components.length > 0) {
                payload.template.components = components;
            }

            const response = await this.axiosInstance.post(
                `/${phoneNumberId}/messages`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                },
            );

            this.logger.log(`Template message sent to ${formattedPhone} via ${phoneNumberId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to send template message to ${to}`, error?.response?.data || error);
            throw new Error(error?.response?.data?.error?.message || 'Failed to send template message');
        }
    }

    /**
     * Format phone number for WhatsApp API (remove non-digits, add country code if needed)
     */
    formatPhoneNumber(phone: string): string {
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');

        // If starts with 0, assume Brazilian number and add 55
        if (cleaned.startsWith('0')) {
            cleaned = '55' + cleaned.substring(1);
        }

        // If doesn't start with country code, assume Brazilian
        if (cleaned.length <= 11) {
            cleaned = '55' + cleaned;
        }

        return cleaned;
    }

    /**
     * Parse template components to extract variables
     */
    parseTemplateVariables(template: MessageTemplate): { header: number; body: number; buttons: number } {
        let headerVars = 0;
        let bodyVars = 0;
        let buttonVars = 0;

        for (const component of template.components || []) {
            if (component.type === 'HEADER' && component.text) {
                const matches = component.text.match(/\{\{(\d+)\}\}/g);
                headerVars = matches ? matches.length : 0;
            }
            if (component.type === 'BODY' && component.text) {
                const matches = component.text.match(/\{\{(\d+)\}\}/g);
                bodyVars = matches ? matches.length : 0;
            }
            if (component.type === 'BUTTONS') {
                for (const button of component.buttons || []) {
                    if (button.url) {
                        const matches = button.url.match(/\{\{(\d+)\}\}/g);
                        buttonVars += matches ? matches.length : 0;
                    }
                }
            }
        }

        return { header: headerVars, body: bodyVars, buttons: buttonVars };
    }
}
