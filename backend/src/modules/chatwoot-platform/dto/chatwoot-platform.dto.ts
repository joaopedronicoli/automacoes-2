import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateInboxDto {
    @IsIn(['email', 'api'])
    type: 'email' | 'api';

    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    webhookUrl?: string;
}

export class AddAgentDto {
    @IsString()
    email: string;

    @IsString()
    name: string;
}
