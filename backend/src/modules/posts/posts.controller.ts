import { Controller, Get, Post, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PostsService } from './posts.service';
import { PostsSyncService } from './posts.sync.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
    constructor(
        private postsService: PostsService,
        private postsSyncService: PostsSyncService,
    ) { }

    @Get()
    async getAll(@Query('accountId') accountId: string, @Query('limit') limit = 50, @Query('offset') offset = 0) {
        return this.postsService.findBySocialAccount(accountId, +limit, +offset);
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
}
