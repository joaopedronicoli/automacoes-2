import { Controller, Get, Patch, Delete, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UsersService } from './users.service';
import { PlansService } from '../plans/plans.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersController {
    constructor(
        private usersService: UsersService,
        private plansService: PlansService,
    ) {}

    @Get()
    async findAll() {
        const users = await this.usersService.findAll();
        const result = await Promise.all(
            users.map(async (u) => {
                const um = await this.plansService.getUserModules(u.id);
                const activeModules = await this.plansService.getActiveModules(u.id);
                return {
                    id: u.id,
                    email: u.email,
                    name: u.name,
                    phone: u.phone,
                    role: u.role,
                    createdAt: u.createdAt,
                    planId: um.planId,
                    planName: um.plan?.name || null,
                    extraModules: um.extraModules || [],
                    disabledModules: um.disabledModules || [],
                    activeModules,
                };
            }),
        );
        return result;
    }

    @Patch(':id')
    async updateUser(
        @Param('id') id: string,
        @Body() body: { name?: string; email?: string; phone?: string },
    ) {
        const user = await this.usersService.findById(id);
        if (!user) {
            throw new BadRequestException('Usuário não encontrado');
        }

        if (body.email && body.email !== user.email) {
            const existing = await this.usersService.findByEmail(body.email);
            if (existing && existing.id !== id) {
                throw new BadRequestException('E-mail já em uso por outro usuário');
            }
            user.email = body.email;
        }
        if (body.name !== undefined) user.name = body.name;
        if (body.phone !== undefined) user.phone = body.phone;

        await this.usersService.saveUser(user);
        return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role };
    }

    @Patch(':id/role')
    async updateRole(@Param('id') id: string, @Body('role') role: string) {
        if (!['user', 'admin'].includes(role)) {
            throw new BadRequestException('Role inválida. Use "user" ou "admin".');
        }

        const user = await this.usersService.findById(id);
        if (!user) {
            throw new BadRequestException('Usuário não encontrado');
        }

        user.role = role;
        await this.usersService.saveUser(user);
        return { id: user.id, email: user.email, name: user.name, role: user.role };
    }

    @Delete(':id')
    async deleteUser(@Param('id') id: string) {
        const user = await this.usersService.findById(id);
        if (!user) {
            throw new BadRequestException('Usuário não encontrado');
        }

        await this.usersService.deleteUser(id);
        return { message: 'Usuário removido com sucesso' };
    }
}
