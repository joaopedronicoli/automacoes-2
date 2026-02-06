import { Controller, Get, Post, Query, Param, Body, UseGuards, Request } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PostsService } from './posts.service';
import { PostsSyncService } from './posts.sync.service';

class ReplyDto {
    @IsString()
    @IsNotEmpty()
    message: string;
}

class SendDmDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    message: string;
}

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
    constructor(
        private postsService: PostsService,
        private postsSyncService: PostsSyncService,
    ) { }

    @Get()
    async getAll(@Request() req, @Query('accountId') accountId: string, @Query('limit') limit = 50, @Query('offset') offset = 0) {
        if (accountId) {
            return this.postsService.findBySocialAccount(accountId, +limit, +offset);
        }
        return this.postsService.findByUser(req.user.userId, +limit, +offset);
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.postsService.findById(id);
    }

    @Post('sync/:accountId')
    async syncAccount(@Param('accountId') accountId: string) {
        await this.postsSyncService.syncAccount(accountId);
        return { success: true, message: 'Sync completed' };
    }

    @Post('sync-all')
    async syncAllAccounts() {
        await this.postsSyncService.syncAllAccounts();
        return { success: true, message: 'All accounts sync completed' };
    }

    /**
     * Get comments for a post
     */
    @Get(':id/comments')
    async getComments(@Param('id') id: string) {
        return this.postsService.getComments(id);
    }

    /**
     * Reply to a comment
     */
    @Post(':id/comments/:commentId/reply')
    async replyToComment(
        @Param('id') postId: string,
        @Param('commentId') commentId: string,
        @Body() dto: ReplyDto,
    ) {
        return this.postsService.replyToComment(postId, commentId, dto.message);
    }

    /**
     * Send DM to a commenter
     */
    @Post(':id/dm')
    async sendDmToCommenter(
        @Param('id') postId: string,
        @Body() dto: SendDmDto,
    ) {
        return this.postsService.sendDmToCommenter(postId, dto.userId, dto.message);
    }
}
