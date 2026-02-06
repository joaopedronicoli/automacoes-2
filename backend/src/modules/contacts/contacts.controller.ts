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
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContactsService } from './contacts.service';
import { HeatLevel, LifecycleStage } from '../../entities/contact.entity';

class UpdateContactDto {
    @IsOptional()
    @IsEnum(LifecycleStage)
    lifecycleStage?: LifecycleStage;

    @IsOptional()
    @IsArray()
    tags?: string[];

    @IsOptional()
    @IsString()
    notes?: string;
}

class SendDmDto {
    @IsString()
    message: string;
}

class CreateTagDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    color?: string;
}

class AddTagDto {
    @IsString()
    tag: string;
}

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
    constructor(private contactsService: ContactsService) {}

    /**
     * Get all contacts with filters
     */
    @Get()
    async getContacts(
        @Request() req,
        @Query('page') page = 1,
        @Query('limit') limit = 20,
        @Query('search') search?: string,
        @Query('platform') platform?: string,
        @Query('heatLevel') heatLevel?: HeatLevel,
        @Query('lifecycleStage') lifecycleStage?: LifecycleStage,
        @Query('tags') tags?: string,
        @Query('sortBy') sortBy = 'lastInteractionAt',
        @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
    ) {
        return this.contactsService.getContacts(req.user.userId, {
            page: +page,
            limit: +limit,
            search,
            platform,
            heatLevel,
            lifecycleStage,
            tags: tags ? tags.split(',') : undefined,
            sortBy,
            sortOrder,
        });
    }

    /**
     * Get contact statistics
     */
    @Get('stats')
    async getStats(@Request() req) {
        return this.contactsService.getStats(req.user.userId);
    }

    /**
     * Get all tags
     */
    @Get('tags')
    async getTags(@Request() req) {
        return this.contactsService.getTags(req.user.userId);
    }

    /**
     * Create a new tag
     */
    @Post('tags')
    async createTag(@Request() req, @Body() dto: CreateTagDto) {
        return this.contactsService.createTag(req.user.userId, dto.name, dto.color);
    }

    /**
     * Delete a tag
     */
    @Delete('tags/:id')
    async deleteTag(@Request() req, @Param('id') tagId: string) {
        await this.contactsService.deleteTag(tagId, req.user.userId);
        return { success: true };
    }

    /**
     * Get a single contact
     */
    @Get(':id')
    async getContact(@Request() req, @Param('id') id: string) {
        return this.contactsService.getContact(id, req.user.userId);
    }

    /**
     * Get contact interactions/timeline
     */
    @Get(':id/interactions')
    async getInteractions(
        @Request() req,
        @Param('id') id: string,
        @Query('limit') limit = 50,
        @Query('offset') offset = 0,
    ) {
        return this.contactsService.getContactInteractions(id, req.user.userId, +limit, +offset);
    }

    /**
     * Update contact
     */
    @Put(':id')
    async updateContact(
        @Request() req,
        @Param('id') id: string,
        @Body() dto: UpdateContactDto,
    ) {
        return this.contactsService.updateContact(id, req.user.userId, dto);
    }

    /**
     * Add tag to contact
     */
    @Post(':id/tags')
    async addTag(@Request() req, @Param('id') id: string, @Body() dto: AddTagDto) {
        return this.contactsService.addTag(id, req.user.userId, dto.tag);
    }

    /**
     * Remove tag from contact
     */
    @Delete(':id/tags/:tag')
    async removeTag(@Request() req, @Param('id') id: string, @Param('tag') tag: string) {
        return this.contactsService.removeTag(id, req.user.userId, tag);
    }

    /**
     * Send DM to contact
     */
    @Post(':id/dm')
    async sendDm(@Request() req, @Param('id') id: string, @Body() dto: SendDmDto) {
        return this.contactsService.sendDm(id, req.user.userId, dto.message);
    }
}
