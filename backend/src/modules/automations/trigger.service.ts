import { Injectable, Logger } from '@nestjs/common';

export interface AutomationTriggers {
    keywords?: string[];
    exactMatch?: boolean;
    excludeKeywords?: string[]; // Blacklist
    detectQuestions?: boolean;
    minLength?: number;
    maxLength?: number;
    userType?: 'anyone' | 'followers' | 'non_followers'; // Placeholder for future
}

@Injectable()
export class TriggerService {
    private readonly logger = new Logger(TriggerService.name);

    /**
     * Check if the event matches the automation triggers
     */
    evaluate(triggers: AutomationTriggers, text: string, context?: any): boolean {
        if (!triggers) return true; // No specific triggers = match all (or careful?)

        // Normalize text
        const lowerText = text.toLowerCase();

        // 1. Keywords Match
        if (triggers.keywords && triggers.keywords.length > 0) {
            if (triggers.exactMatch) {
                // Exact match (one of the phrases)
                const matched = triggers.keywords.some(k => k.toLowerCase().trim() === lowerText.trim());
                if (!matched) return false;
            } else {
                // Contains match
                const matched = triggers.keywords.some(k => lowerText.includes(k.toLowerCase().trim()));
                if (!matched) return false;
            }
        }

        // 2. Exclude Keywords (Blacklist)
        if (triggers.excludeKeywords && triggers.excludeKeywords.length > 0) {
            const hasBlacklisted = triggers.excludeKeywords.some(k => lowerText.includes(k.toLowerCase().trim()));
            if (hasBlacklisted) return false;
        }

        // 3. Detect Questions
        if (triggers.detectQuestions) {
            if (!text.includes('?')) return false;
        }

        // 4. Length Constraints
        if (triggers.minLength && text.length < triggers.minLength) return false;
        if (triggers.maxLength && text.length > triggers.maxLength) return false;

        return true;
    }
}
