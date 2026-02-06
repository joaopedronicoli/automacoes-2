import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LogsService } from './logs.service';

@Controller('logs')
@UseGuards(JwtAuthGuard)
export class LogsController {
    constructor(private logsService: LogsService) { }

    @Get()
    async getAll(
        @Request() req,
        @Query('automationId') automationId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit = 100,
        @Query('offset') offset = 0,
    ) {
        if (automationId) {
            return this.logsService.findByAutomation(automationId, +limit, +offset);
        }

        if (startDate && endDate) {
            return this.logsService.findByDateRange(new Date(startDate), new Date(endDate), +limit, +offset);
        }

        // Return logs for current user
        return this.logsService.findByUser(req.user.userId, +limit, +offset);
    }

    @Get('export')
    async exportCsv(@Query('automationId') automationId?: string) {
        // TODO: Implement CSV export
        return { message: 'CSV export (implementation pending)' };
    }
}
