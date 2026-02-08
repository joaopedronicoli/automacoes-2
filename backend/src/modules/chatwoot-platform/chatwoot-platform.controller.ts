import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleGuard } from '../plans/guards/module.guard';
import { RequiresModule } from '../plans/decorators/requires-module.decorator';
import { AppModule } from '../../entities/enums/app-module.enum';
import { ChatwootManagementService } from './chatwoot-management.service';
import { CreateInboxDto, AddAgentDto } from './dto/chatwoot-platform.dto';

@Controller('chatwoot-platform')
@UseGuards(JwtAuthGuard, ModuleGuard)
@RequiresModule(AppModule.CHATWOOT)
export class ChatwootPlatformController {
    constructor(private readonly managementService: ChatwootManagementService) {}

    @Post('setup')
    async setup(@Request() req: any) {
        return this.managementService.setupChatwootAccount(req.user.userId);
    }

    @Get('account')
    async getAccount(@Request() req: any) {
        return this.managementService.getAccountInfo(req.user.userId);
    }

    @Get('limits')
    async getLimits(@Request() req: any) {
        return this.managementService.getEffectiveLimits(req.user.userId);
    }

    // --- Inboxes ---

    @Get('inboxes')
    async getInboxes(@Request() req: any) {
        return this.managementService.getInboxes(req.user.userId);
    }

    @Post('inboxes')
    async createInbox(@Request() req: any, @Body() dto: CreateInboxDto) {
        return this.managementService.createInbox(req.user.userId, dto);
    }

    @Delete('inboxes/:inboxId')
    async deleteInbox(@Request() req: any, @Param('inboxId') inboxId: string) {
        return this.managementService.deleteInbox(req.user.userId, Number(inboxId));
    }

    // --- WhatsApp ---

    @Get('whatsapp')
    async getWhatsAppInstances(@Request() req: any) {
        return this.managementService.getWhatsAppInstances(req.user.userId);
    }

    @Post('whatsapp')
    async createWhatsAppInstance(@Request() req: any) {
        return this.managementService.createWhatsAppInstance(req.user.userId);
    }

    @Get('whatsapp/:id/qr')
    async getWhatsAppQrCode(@Request() req: any, @Param('id') id: string) {
        return this.managementService.getWhatsAppQrCode(req.user.userId, id);
    }

    @Get('whatsapp/:id/status')
    async getWhatsAppStatus(@Request() req: any, @Param('id') id: string) {
        return this.managementService.getWhatsAppConnectionState(req.user.userId, id);
    }

    @Delete('whatsapp/:id')
    async deleteWhatsAppInstance(@Request() req: any, @Param('id') id: string) {
        return this.managementService.deleteWhatsAppInstance(req.user.userId, id);
    }

    // --- Agents ---

    @Get('agents')
    async getAgents(@Request() req: any) {
        return this.managementService.getAgents(req.user.userId);
    }

    @Post('agents')
    async addAgent(@Request() req: any, @Body() dto: AddAgentDto) {
        return this.managementService.addAgent(req.user.userId, dto);
    }

    @Delete('agents/:id')
    async removeAgent(@Request() req: any, @Param('id') id: string) {
        return this.managementService.removeAgent(req.user.userId, Number(id));
    }
}
