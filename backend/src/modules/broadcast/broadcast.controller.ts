import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
    Logger,
    UploadedFile,
    UseInterceptors,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BroadcastService, CreateBroadcastDto } from './broadcast.service';

@Controller('broadcast')
@UseGuards(JwtAuthGuard)
export class BroadcastController {
    private readonly logger = new Logger(BroadcastController.name);

    constructor(private broadcastService: BroadcastService) {}

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
}
