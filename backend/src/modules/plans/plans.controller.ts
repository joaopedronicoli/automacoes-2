import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignPlanDto } from './dto/assign-plan.dto';
import { SetModulesDto } from './dto/set-modules.dto';

@Controller('admin/plans')
@UseGuards(JwtAuthGuard, AdminGuard)
export class PlansController {
    constructor(private plansService: PlansService) {}

    @Get()
    async findAll() {
        return this.plansService.findAllPlans();
    }

    @Post()
    async create(@Body() dto: CreatePlanDto) {
        return this.plansService.createPlan(dto);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
        return this.plansService.updatePlan(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.plansService.deletePlan(id);
    }
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UserModulesController {
    constructor(private plansService: PlansService) {}

    @Get(':id/modules')
    async getUserModules(@Param('id') id: string) {
        const um = await this.plansService.getUserModules(id);
        const activeModules = await this.plansService.getActiveModules(id);
        return { ...um, activeModules };
    }

    @Patch(':id/plan')
    async assignPlan(@Param('id') id: string, @Body() dto: AssignPlanDto) {
        const um = await this.plansService.assignPlan(id, dto.planId || null);
        const activeModules = await this.plansService.getActiveModules(id);
        return { ...um, activeModules };
    }

    @Patch(':id/modules')
    async setModules(@Param('id') id: string, @Body() dto: SetModulesDto) {
        const um = await this.plansService.setExtraModules(id, dto);
        const activeModules = await this.plansService.getActiveModules(id);
        return { ...um, activeModules };
    }
}
