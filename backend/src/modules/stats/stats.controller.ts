import { Controller, Get, UseGuards, Request, Param } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
    constructor(private readonly statsService: StatsService) { }

    @Get('dashboard')
    async getDashboardStats(@Request() req: any) {
        return this.statsService.getDashboardStats(req.user.userId);
    }

    @Get('automation/:id')
    async getAutomationStats(@Request() req: any, @Param('id') id: string) {
        return this.statsService.getAutomationStats(req.user.userId, id);
    }
}
