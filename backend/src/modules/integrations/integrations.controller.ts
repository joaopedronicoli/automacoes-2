import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsUrl, IsNumber, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IntegrationsService } from './integrations.service';

class TestWooCommerceDto {
    @IsUrl({}, { message: 'URL da loja inválida' })
    @IsNotEmpty({ message: 'URL da loja é obrigatória' })
    storeUrl: string;

    @IsString()
    @IsNotEmpty({ message: 'Consumer Key é obrigatória' })
    consumerKey: string;

    @IsString()
    @IsNotEmpty({ message: 'Consumer Secret é obrigatória' })
    consumerSecret: string;
}

class CreateWooCommerceDto {
    @IsString()
    @IsNotEmpty({ message: 'Nome é obrigatório' })
    name: string;

    @IsUrl({}, { message: 'URL da loja inválida' })
    @IsNotEmpty({ message: 'URL da loja é obrigatória' })
    storeUrl: string;

    @IsString()
    @IsNotEmpty({ message: 'Consumer Key é obrigatória' })
    consumerKey: string;

    @IsString()
    @IsNotEmpty({ message: 'Consumer Secret é obrigatória' })
    consumerSecret: string;
}

class TestChatwootDto {
    @IsUrl({}, { message: 'URL do Chatwoot inválida' })
    @IsNotEmpty({ message: 'URL do Chatwoot é obrigatória' })
    chatwootUrl: string;

    @IsString()
    @IsNotEmpty({ message: 'Token de acesso é obrigatório' })
    accessToken: string;
}

class CreateChatwootDto {
    @IsString()
    @IsNotEmpty({ message: 'Nome é obrigatório' })
    name: string;

    @IsUrl({}, { message: 'URL do Chatwoot inválida' })
    @IsNotEmpty({ message: 'URL do Chatwoot é obrigatória' })
    chatwootUrl: string;

    @IsString()
    @IsNotEmpty({ message: 'Token de acesso é obrigatório' })
    accessToken: string;

    @IsNumber({}, { message: 'ID da caixa de entrada (Inbox ID) deve ser um número' })
    @IsNotEmpty({ message: 'ID da caixa de entrada (Inbox ID) é obrigatório' })
    inboxId: number;

    @IsNumber({}, { message: 'ID da conta (Account ID) deve ser um número' })
    @IsNotEmpty({ message: 'ID da conta (Account ID) é obrigatório' })
    accountId: number;

    @IsNumber({}, { message: 'Inbox ID do Instagram deve ser um número' })
    @IsOptional()
    instagramInboxId?: number;

    @IsString()
    @IsOptional()
    instagramAccountId?: string;
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

    @Put('woocommerce/:id')
    async updateWooCommerce(@Request() req, @Param('id') id: string, @Body() dto: CreateWooCommerceDto) {
        return this.integrationsService.updateWooCommerce(id, req.user.userId, dto);
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

    @Post('chatwoot/test')
    async testChatwoot(@Body() dto: TestChatwootDto) {
        return this.integrationsService.testChatwootConnection(
            dto.chatwootUrl,
            dto.accessToken,
        );
    }

    @Post('chatwoot')
    async createChatwoot(@Request() req, @Body() dto: CreateChatwootDto) {
        return this.integrationsService.createChatwoot(req.user.userId, dto);
    }

    @Get('chatwoot')
    async getAllChatwoot(@Request() req) {
        return this.integrationsService.findAllChatwoot(req.user.userId);
    }

    @Get('chatwoot/:id')
    async getChatwootById(@Request() req, @Param('id') id: string) {
        return this.integrationsService.findChatwootById(id, req.user.userId);
    }

    @Put('chatwoot/:id')
    async updateChatwoot(@Request() req, @Param('id') id: string, @Body() dto: CreateChatwootDto) {
        return this.integrationsService.updateChatwoot(id, req.user.userId, dto);
    }

    @Get('chatwoot/:id/labels')
    async getChatwootLabels(@Request() req, @Param('id') id: string) {
        return this.integrationsService.getChatwootLabels(id, req.user.userId);
    }
}
