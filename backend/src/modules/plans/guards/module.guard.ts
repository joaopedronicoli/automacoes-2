import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_MODULE_KEY } from '../decorators/requires-module.decorator';
import { PlansService } from '../plans.service';

@Injectable()
export class ModuleGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private plansService: PlansService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredModule = this.reflector.getAllAndOverride<string>(REQUIRED_MODULE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredModule) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const { userId, role } = request.user;

        // Admin has access to all modules
        if (role === 'admin') {
            return true;
        }

        const hasAccess = await this.plansService.hasModule(userId, requiredModule);
        if (!hasAccess) {
            throw new ForbiddenException('Você não tem acesso a este módulo. Entre em contato com o administrador.');
        }

        return true;
    }
}
