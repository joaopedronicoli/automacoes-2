import { IsString, IsOptional } from 'class-validator';

export class CreateSubscriptionDto {
    @IsString()
    planSlug: string;

    @IsOptional()
    @IsString()
    returnUrl?: string;
}
