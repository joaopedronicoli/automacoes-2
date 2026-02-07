import { IsArray, IsOptional, IsString } from 'class-validator';

export class SetModulesDto {
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    extraModules?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    disabledModules?: string[];
}
