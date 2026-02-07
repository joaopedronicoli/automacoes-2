import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AdminGuard implements CanActivate {
    constructor(private usersService: UsersService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { userId } = request.user;

        const user = await this.usersService.findById(userId);
        if (!user || user.role !== 'admin') {
            throw new ForbiddenException('Acesso restrito a administradores');
        }

        return true;
    }
}
