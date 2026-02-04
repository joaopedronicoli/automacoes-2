import { Controller, Get, Delete, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SocialAccountsService } from './social-accounts.service';

class UpdateTokenDto {
    @IsString()
    @IsNotEmpty({ message: 'Token de acesso é obrigatório' })
    accessToken: string;
}

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

    @Patch(':id/token')
    async updateToken(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: UpdateTokenDto,
    ) {
        await this.socialAccountsService.updateToken(id, req.user.userId, dto.accessToken);
        return { message: 'Token updated successfully' };
    }
}
