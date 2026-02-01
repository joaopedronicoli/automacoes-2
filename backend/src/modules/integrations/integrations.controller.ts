import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IntegrationsService } from './integrations.service';

class TestWooCommerceDto {
    storeUrl: string;
    consumerKey: string;
    consumerSecret: string;
}

class CreateWooCommerceDto {
    name: string;
    storeUrl: string;
    consumerKey: string;
    consumerSecret: string;
}

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
    constructor(private integrationsService: IntegrationsService) {}

    @Get()
    async getAll(@Request() req) {
        return this.integrationsService.findByUser(req.user.userId);
    }

    @Post('woocommerce/test')
    async testWooCommerce(@Body() dto: TestWooCommerceDto) {
        return this.integrationsService.testWooCommerceConnection(
            dto.storeUrl,
            dto.consumerKey,
            dto.consumerSecret,
        );
    }

    @Post('woocommerce')
    async createWooCommerce(@Request() req, @Body() dto: CreateWooCommerceDto) {
        return this.integrationsService.createWooCommerce(req.user.userId, dto);
    }

    @Delete(':id')
    async delete(@Request() req, @Param('id') id: string) {
        await this.integrationsService.delete(id, req.user.userId);
        return { success: true };
    }

    @Get('woocommerce/products')
    async getWooCommerceProducts(
        @Request() req,
        @Query('search') search?: string,
        @Query('limit') limit?: number,
    ) {
        return this.integrationsService.getWooCommerceProducts(
            req.user.userId,
            search,
            limit || 50,
        );
    }

    @Get('woocommerce/products/:productId')
    async getWooCommerceProduct(
        @Request() req,
        @Param('productId') productId: string,
    ) {
        return this.integrationsService.getWooCommerceProductById(
            req.user.userId,
            parseInt(productId, 10),
        );
    }
}
