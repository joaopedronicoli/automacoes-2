import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentsService } from './comments.service';

class ReplyDto {
    @IsString()
    @IsNotEmpty()
    message: string;
}

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
    constructor(private commentsService: CommentsService) {}

    @Get('stats')
    async getStats(@Request() req) {
        return this.commentsService.getStats(req.user.userId);
    }

    @Get()
    async getComments(
        @Request() req,
        @Query('status') status?: 'all' | 'unreplied' | 'replied',
        @Query('search') search?: string,
        @Query('accountId') accountId?: string,
        @Query('platform') platform?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.commentsService.getCommentsGrouped(req.user.userId, {
            status,
            search,
            accountId,
            platform,
            dateFrom,
            dateTo,
            page: page ? +page : 1,
            limit: limit ? +limit : 10,
        });
    }

    @Post(':id/reply')
    async replyToComment(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: ReplyDto,
    ) {
        return this.commentsService.replyToComment(req.user.userId, id, dto.message);
    }

    @Post(':id/dm')
    async sendDm(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: ReplyDto,
    ) {
        return this.commentsService.sendDm(req.user.userId, id, dto.message);
    }
}
