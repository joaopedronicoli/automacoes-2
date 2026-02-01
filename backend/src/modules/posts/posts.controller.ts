import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PostsService } from './posts.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
    constructor(private postsService: PostsService) { }

    @Get()
    async getAll(@Query('accountId') accountId: string, @Query('limit') limit = 50, @Query('offset') offset = 0) {
        return this.postsService.findBySocialAccount(accountId, +limit, +offset);
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.postsService.findById(id);
    }
}
