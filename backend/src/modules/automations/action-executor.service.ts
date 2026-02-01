import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { FacebookService } from '../platforms/facebook/facebook.service';
import { LogsService } from '../logs/logs.service';
import { LogActionType, LogStatus } from '../../entities/automation-log.entity';

export interface ActionContext {
    platform: 'facebook' | 'instagram';
    platformUserId: string; // The page or account ID
    targetUserId: string;   // The end user string/ID
    targetUserName?: string;
    itemId: string;         // The comment ID or object ID being acted on
    accessToken: string;    // Token to use for API calls
}

export interface ResponseConfig {
    commentReply?: {
        message: string;
        delaySeconds?: number;
    };
    directMessage?: {
        message: string;
        delaySeconds?: number;
    };
}

@Injectable()
export class ActionExecutorService {
    private readonly logger = new Logger(ActionExecutorService.name);

    constructor(
        @Inject(forwardRef(() => FacebookService))
        private facebookService: FacebookService,
        private logsService: LogsService,
    ) { }

    async execute(
        automationId: string,
        config: ResponseConfig,
        context: ActionContext,
        triggerContent?: string, // The text that triggered this (for context)
    ): Promise<void> {
        const { platform, accessToken, targetUserId, itemId } = context;

        try {
            // 1. Comment Reply
            if (config.commentReply) {
                const message = this.processTemplate(config.commentReply.message, context);

                // TODO: Implement delay logic (e.g., via delayed queue job)
                // For MVP, immediate execution

                try {
                    if (platform === 'facebook') {
                        await this.facebookService.replyToComment(itemId, message, accessToken);
                    } else {
                        await this.facebookService.replyToInstagramComment(itemId, message, accessToken);
                    }

                    await this.log(automationId, context, LogActionType.COMMENT_REPLY, LogStatus.SUCCESS, message);
                } catch (e) {
                    await this.log(automationId, context, LogActionType.COMMENT_REPLY, LogStatus.ERROR, e.message);
                    throw e; // Re-throw to might retry entire job
                }
            }

            // 2. Direct Message
            if (config.directMessage) {
                const message = this.processTemplate(config.directMessage.message, context);

                try {
                    if (platform === 'facebook') {
                        await this.facebookService.sendPrivateMessage(context.platformUserId, targetUserId, message, accessToken);
                    } else {
                        await this.facebookService.sendInstagramMessage(context.platformUserId, targetUserId, message, accessToken);
                    }

                    await this.log(automationId, context, LogActionType.DM_SENT, LogStatus.SUCCESS, message);
                } catch (e) {
                    await this.log(automationId, context, LogActionType.DM_SENT, LogStatus.ERROR, e.message);
                    // Don't necessarily throw if comment succeeded but DM failed? 
                    // For now, let's log error but not fail the whole job if one part succeeded? 
                    // Actually, safer to treat as partial failure.
                }
            }

        } catch (error) {
            this.logger.error(`Action execution failed: ${error.message}`);
            // Logs are handled in individual blocks
        }
    }

    private processTemplate(template: string, ctx: ActionContext): string {
        let res = template || '';
        if (ctx.targetUserName) res = res.replace(/{{name}}/g, ctx.targetUserName);
        // Add spintax support? (e.g. {Hello|Hi|Hey}) - unique for advanced
        return res;
    }

    private async log(
        automationId: string,
        ctx: ActionContext,
        type: LogActionType,
        status: LogStatus,
        content: string,
    ) {
        await this.logsService.create({
            automationId,
            userPlatformId: ctx.targetUserId,
            actionType: type,
            status: status,
            content,
        });
    }
}
