import { IsString, IsNumber, IsArray, IsOptional, IsBoolean, Min } from 'class-validator';

export class UpdatePlanDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    slug?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    modules?: string[];

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsNumber()
    sortOrder?: number;

    @IsOptional()
    @IsString()
    stripePriceId?: string;

    @IsOptional()
    @IsNumber()
    maxChatwootInboxes?: number;

    @IsOptional()
    @IsNumber()
    maxChatwootAgents?: number;

    @IsOptional()
    @IsNumber()
    maxWhatsappConnections?: number;
}
