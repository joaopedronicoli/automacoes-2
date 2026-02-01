import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
    constructor(private usersService: UsersService) {}

    /**
     * GET /api/auth/me
     * Returns the current user info from Supabase JWT
     * Also ensures the user exists in the local DB
     */
    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getMe(@Request() req) {
        const { userId, email } = req.user;

        // Ensure user record exists in local DB
        const user = await this.usersService.findOrCreateFromSupabase(userId, email);

        return {
            id: user.id,
            email: user.email,
            name: user.name,
        };
    }
}
