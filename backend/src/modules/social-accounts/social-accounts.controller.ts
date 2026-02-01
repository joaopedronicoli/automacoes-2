import { Controller, Get, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SocialAccountsService } from './social-accounts.service';

@Controller('social-accounts')
@UseGuards(JwtAuthGuard)
export class SocialAccountsController {
    constructor(private socialAccountsService: SocialAccountsService) { }

    @Get()
    async getAll(@Request() req) {
        return this.socialAccountsService.findByUser(req.user.userId);
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.socialAccountsService.findById(id);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.socialAccountsService.delete(id);
        return { message: 'Account disconnected successfully' };
    }
}
