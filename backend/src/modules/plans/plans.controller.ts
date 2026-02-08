import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignPlanDto } from './dto/assign-plan.dto';
import { SetModulesDto } from './dto/set-modules.dto';

@Controller('plans')
export class PublicPlansController {
    constructor(private plansService: PlansService) {}

    @Get()
    async getActivePlans() {
        const plans = await this.plansService.findAllPlans();
        return plans
            .filter((p) => p.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }

    @Get('my-subscription')
    @UseGuards(JwtAuthGuard)
    async getMySubscription(@Req() req: any) {
        const userId = req.user.userId;
        const um = await this.plansService.getUserModules(userId);
        const activeModules = await this.plansService.getActiveModules(userId);
        return {
            planId: um.planId,
            planName: um.plan?.name || null,
            planSlug: um.plan?.slug || null,
            planPrice: um.plan?.price || 0,
            planModules: um.plan?.modules || [],
            activeModules,
            extraModules: um.extraModules || [],
            disabledModules: um.disabledModules || [],
        };
    }
}

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
