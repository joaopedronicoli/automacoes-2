import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    Logger,
    UploadedFile,
    UseInterceptors,
    BadRequestException,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BroadcastService } from './broadcast.service';
import {
    CreateBroadcastDto,
    TemplatePreviewDto,
    AnalyticsFilters,
    BroadcastContact,
} from './dto/broadcast.dto';

@Controller('broadcast')
@UseGuards(JwtAuthGuard)
export class BroadcastController {
    private readonly logger = new Logger(BroadcastController.name);

    constructor(private broadcastService: BroadcastService) {}

    /**
     * Download CSV template
     * GET /api/broadcast/csv-template
     */
    @Get('csv-template')
    async downloadCSVTemplate(@Res() res: Response) {
        const csvContent = 'name,phone,var1,var2,var3\n' +
                           'João Silva,5511999999999,Valor1,Valor2,Valor3\n' +
                           'Maria Santos,5521988888888,OutroValor,Teste,Exemplo\n';

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=broadcast-template.csv');
        return res.send(csvContent);
    }

    /**
     * Upload CSV and get preview
     * POST /api/broadcast/upload-csv
     */
    @Post('upload-csv')
    @UseInterceptors(FileInterceptor('file'))
    async uploadCSV(@UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string }) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Check file type
        const allowedMimeTypes = ['text/csv', 'text/plain', 'application/vnd.ms-excel'];
        if (!allowedMimeTypes.includes(file.mimetype) && !file.originalname.endsWith('.csv')) {
            throw new BadRequestException('File must be a CSV');
        }

        // Parse CSV content
        const csvContent = file.buffer.toString('utf-8');
        const result = this.broadcastService.parseCSV(csvContent);

        this.logger.log(`Parsed CSV: ${result.validRows} valid contacts out of ${result.totalRows} rows`);

        return {
            ...result,
            preview: result.contacts.slice(0, 10), // Return first 10 for preview
        };
    }

    /**
     * Create and start a broadcast
     * POST /api/broadcast
     */
    @Post()
    async createBroadcast(@Request() req, @Body() dto: CreateBroadcastDto) {
        try {
            const broadcast = await this.broadcastService.createAndStart(req.user.userId, dto);
            this.logger.log(`Created broadcast ${broadcast.id} for user ${req.user.userId}`);
            return broadcast;
        } catch (error) {
            this.logger.error('Failed to create broadcast', error);
            throw error;
        }
    }

    /**
     * List all broadcasts for user
     * GET /api/broadcast
     */
    @Get()
    async listBroadcasts(@Request() req) {
        const broadcasts = await this.broadcastService.findByUser(req.user.userId);
        return broadcasts;
    }

    /**
     * Get broadcast details
     * GET /api/broadcast/:id
     */
    @Get(':id')
    async getBroadcast(@Request() req, @Param('id') id: string) {
        const broadcast = await this.broadcastService.findById(id);

        if (!broadcast || broadcast.userId !== req.user.userId) {
            throw new BadRequestException('Broadcast not found');
        }

        return broadcast;
    }

    /**
     * Cancel a broadcast
     * POST /api/broadcast/:id/cancel
     */
    @Post(':id/cancel')
    async cancelBroadcast(@Request() req, @Param('id') id: string) {
        try {
            const broadcast = await this.broadcastService.cancel(id, req.user.userId);
            this.logger.log(`Cancelled broadcast ${id}`);
            return broadcast;
        } catch (error) {
            this.logger.error(`Failed to cancel broadcast ${id}`, error);
            throw error;
        }
    }

    /**
     * Delete a broadcast
     * DELETE /api/broadcast/:id
     */
    @Delete(':id')
    async deleteBroadcast(@Request() req, @Param('id') id: string) {
        await this.broadcastService.delete(id, req.user.userId);
        return { success: true };
    }

    // ========================================
    // NEW ENDPOINTS
    // ========================================

    /**
     * Schedule a broadcast for later
     * POST /api/broadcast/schedule
     */
    @Post('schedule')
    async scheduleBroadcast(@Request() req, @Body() dto: CreateBroadcastDto) {
        try {
            const broadcast = await this.broadcastService.schedule(req.user.userId, dto);
            this.logger.log(`Scheduled broadcast ${broadcast.id} for user ${req.user.userId}`);
            return broadcast;
        } catch (error) {
            this.logger.error('Failed to schedule broadcast', error);
            throw error;
        }
    }

    /**
     * Preview template with variables
     * POST /api/broadcast/preview-template
     */
    @Post('preview-template')
    async previewTemplate(@Request() req, @Body() dto: TemplatePreviewDto) {
        try {
            return await this.broadcastService.generateTemplatePreview(req.user.userId, dto);
        } catch (error) {
            this.logger.error('Failed to generate template preview', error);
            throw error;
        }
    }

    /**
     * Check for duplicate contacts
     * POST /api/broadcast/check-duplicates
     */
    @Post('check-duplicates')
    async checkDuplicates(
        @Request() req,
        @Body() body: { name: string; contacts: BroadcastContact[] },
    ) {
        try {
            return await this.broadcastService.checkDuplicates(
                req.user.userId,
                body.name,
                body.contacts,
            );
        } catch (error) {
            this.logger.error('Failed to check duplicates', error);
            throw error;
        }
    }

    /**
     * Get analytics
     * GET /api/broadcast/analytics
     */
    @Get('analytics')
    async getAnalytics(
        @Request() req,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('status') status?: string,
    ) {
        try {
            const filters: AnalyticsFilters = { startDate, endDate, status };
            return await this.broadcastService.getAnalytics(req.user.userId, filters);
        } catch (error) {
            this.logger.error('Failed to get analytics', error);
            throw error;
        }
    }

    /**
     * Sync contacts with Chatwoot
     * POST /api/broadcast/:id/chatwoot-sync
     */
    @Post(':id/chatwoot-sync')
    async chatwootSync(@Request() req, @Param('id') id: string) {
        try {
            const result = await this.broadcastService.syncContactsWithChatwoot(id, req.user.userId);
            this.logger.log(`Chatwoot sync completed for broadcast ${id}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to sync with Chatwoot for broadcast ${id}`, error);
            throw error;
        }
    }

    /**
     * Create missing contacts in Chatwoot
     * POST /api/broadcast/:id/chatwoot-create-missing
     */
    @Post(':id/chatwoot-create-missing')
    async chatwootCreateMissing(@Request() req, @Param('id') id: string) {
        try {
            const result = await this.broadcastService.createMissingChatwootContacts(id, req.user.userId);
            this.logger.log(`Created missing Chatwoot contacts for broadcast ${id}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to create Chatwoot contacts for broadcast ${id}`, error);
            throw error;
        }
    }

    /**
     * Retry failed messages
     * POST /api/broadcast/:id/retry-failed
     */
    @Post(':id/retry-failed')
    async retryFailed(@Request() req, @Param('id') id: string) {
        try {
            const broadcast = await this.broadcastService.retryFailed(id, req.user.userId);
            this.logger.log(`Retrying failed messages for broadcast ${id}`);
            return broadcast;
        } catch (error) {
            this.logger.error(`Failed to retry broadcast ${id}`, error);
            throw error;
        }
    }

    /**
     * Pause a broadcast
     * POST /api/broadcast/:id/pause
     */
    @Post(':id/pause')
    async pauseBroadcast(@Request() req, @Param('id') id: string) {
        try {
            const broadcast = await this.broadcastService.findById(id);

            if (!broadcast || broadcast.userId !== req.user.userId) {
                throw new BadRequestException('Broadcast not found');
            }

            await this.broadcastService.pauseBroadcast(id);
            this.logger.log(`Paused broadcast ${id}`);
            return { success: true, status: 'paused' };
        } catch (error) {
            this.logger.error(`Failed to pause broadcast ${id}`, error);
            throw error;
        }
    }

    /**
     * Resume a paused broadcast
     * POST /api/broadcast/:id/resume
     */
    @Post(':id/resume')
    async resumeBroadcast(@Request() req, @Param('id') id: string) {
        try {
            const broadcast = await this.broadcastService.resumeBroadcast(id);

            if (broadcast.userId !== req.user.userId) {
                throw new BadRequestException('Broadcast not found');
            }

            this.logger.log(`Resumed broadcast ${id}`);
            return broadcast;
        } catch (error) {
            this.logger.error(`Failed to resume broadcast ${id}`, error);
            throw error;
        }
    }
}
