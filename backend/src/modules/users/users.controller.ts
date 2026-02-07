import { Controller, Get, Patch, Delete, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UsersService } from './users.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersController {
    constructor(private usersService: UsersService) {}

    @Get()
    async findAll() {
        const users = await this.usersService.findAll();
        return users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            phone: u.phone,
            role: u.role,
            createdAt: u.createdAt,
        }));
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
