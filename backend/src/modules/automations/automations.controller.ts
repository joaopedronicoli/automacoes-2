import { Controller, Get, Post, Put, Delete, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleGuard } from '../plans/guards/module.guard';
import { RequiresModule } from '../plans/decorators/requires-module.decorator';
import { AppModule } from '../../entities/enums/app-module.enum';
import { AutomationsService } from './automations.service';
import { Automation } from '../../entities/automation.entity';

@Controller('automations')
@UseGuards(JwtAuthGuard, ModuleGuard)
@RequiresModule(AppModule.AUTOMATIONS)
export class AutomationsController {
    constructor(private automationsService: AutomationsService) { }

    @Get()
    async getAll(@Request() req) {
        return this.automationsService.findByUser(req.user.userId);
    }

    @Post()
    async create(@Request() req, @Body() automationData: Partial<Automation>) {
        automationData.userId = req.user.userId;
        return this.automationsService.create(automationData);
    }

    @Get(':id')
    async getOne(@Param('id') id: string) {
        return this.automationsService.findById(id);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() automationData: Partial<Automation>) {
        return this.automationsService.update(id, automationData);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.automationsService.delete(id);
        return { message: 'Automation deleted successfully' };
    }

    @Patch(':id/toggle')
    async toggle(@Param('id') id: string) {
        return this.automationsService.toggleStatus(id);
    }
}
