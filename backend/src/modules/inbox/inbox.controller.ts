import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InboxService } from './inbox.service';
import { ConversationStatus } from '../../entities/conversation.entity';

class SendMessageDto {
    content: string;
}

class UpdateStatusDto {
    status: ConversationStatus;
}

@Controller('inbox')
@UseGuards(JwtAuthGuard)
export class InboxController {
    constructor(private inboxService: InboxService) {}

    @Get('conversations')
    async getConversations(
        @Request() req,
        @Query('status') status?: ConversationStatus,
    ) {
        return this.inboxService.getConversations(req.user.userId, status);
    }

    @Get('conversations/:id')
    async getConversation(@Request() req, @Param('id') id: string) {
        return this.inboxService.getConversation(id, req.user.userId);
    }

    @Get('conversations/:id/messages')
    async getMessages(
        @Request() req,
        @Param('id') id: string,
        @Query('limit') limit = 50,
        @Query('offset') offset = 0,
    ) {
        return this.inboxService.getMessages(id, req.user.userId, +limit, +offset);
    }

    @Post('conversations/:id/messages')
    async sendMessage(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: SendMessageDto,
    ) {
        return this.inboxService.sendMessage(id, req.user.userId, dto.content);
    }

    @Put('conversations/:id/read')
    async markAsRead(@Request() req, @Param('id') id: string) {
        await this.inboxService.markAsRead(id, req.user.userId);
        return { success: true };
    }

    @Put('conversations/:id/status')
    async updateStatus(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: UpdateStatusDto,
    ) {
        return this.inboxService.updateStatus(id, req.user.userId, dto.status);
    }

    @Get('unread-count')
    async getUnreadCount(@Request() req) {
        const count = await this.inboxService.getUnreadCount(req.user.userId);
        return { count };
    }
}
