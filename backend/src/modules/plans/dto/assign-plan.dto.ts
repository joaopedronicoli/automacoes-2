import { IsString, IsOptional } from 'class-validator';

export class AssignPlanDto {
    @IsOptional()
    @IsString()
    planId?: string;
}
