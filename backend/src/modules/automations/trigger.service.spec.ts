import { Test, TestingModule } from '@nestjs/testing';
import { TriggerService } from './trigger.service';
import { AutomationTriggers } from '../../entities/automation.entity';

describe('TriggerService', () => {
    let service: TriggerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TriggerService],
        }).compile();

        service = module.get<TriggerService>(TriggerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('evaluate', () => {
        it('should return true if no triggers are defined', () => {
            expect(service.evaluate(null as any, 'some text')).toBe(true);
            expect(service.evaluate({} as any, 'some text')).toBe(true);
        });

        it('should match keywords (contains)', () => {
            const triggers: AutomationTriggers = { keywords: ['price', 'cost'], exactMatch: false };
            expect(service.evaluate(triggers, 'What is the price?')).toBe(true);
            expect(service.evaluate(triggers, 'How much does it cost?')).toBe(true);
            expect(service.evaluate(triggers, 'Hello world')).toBe(false);
        });

        it('should match keywords (exact)', () => {
            const triggers: AutomationTriggers = { keywords: ['info'], exactMatch: true };
            expect(service.evaluate(triggers, 'info')).toBe(true);
            expect(service.evaluate(triggers, 'Info')).toBe(true); // Case insensitive
            expect(service.evaluate(triggers, 'give me info')).toBe(false);
        });

        it('should respect blacklist', () => {
            const triggers: AutomationTriggers = { keywords: ['price'], excludeKeywords: ['free'] };
            expect(service.evaluate(triggers, 'What is the price?')).toBe(true);
            expect(service.evaluate(triggers, 'Is the price free?')).toBe(false);
        });

        it('should detect questions', () => {
            const triggers: AutomationTriggers = { detectQuestions: true };
            expect(service.evaluate(triggers, 'Is this available?')).toBe(true);
            expect(service.evaluate(triggers, 'Where are you located?')).toBe(true);
            expect(service.evaluate(triggers, 'This looks great')).toBe(false);
        });

        it('should respect regex', () => {
            const triggers: AutomationTriggers = { regex: '^hi.*$' };
            expect(service.evaluate(triggers, 'hi there')).toBe(true);
            expect(service.evaluate(triggers, 'oh hi')).toBe(false); // assumes regex is tested against full string if anchors used
        });
    });
});
