import { SetMetadata } from '@nestjs/common';
import { AppModule } from '../../../entities/enums/app-module.enum';

export const REQUIRED_MODULE_KEY = 'requiredModule';
export const RequiresModule = (module: AppModule) => SetMetadata(REQUIRED_MODULE_KEY, module);
