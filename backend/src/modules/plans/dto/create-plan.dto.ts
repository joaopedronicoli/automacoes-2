import { IsString, IsNumber, IsArray, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreatePlanDto {
    @IsString()
    name: string;

    @IsString()
    slug: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsArray()
    @IsString({ each: true })
    modules: string[];

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsNumber()
    sortOrder?: number;

    @IsOptional()
    @IsString()
    stripePriceId?: string;
}
