import { ModuleMetadata } from '@nestjs/common';

export interface AmqpModuleOptions {
  urls: string[];
  isGlobal?: boolean;
}

export interface AmqpModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  isGlobal?: boolean;
  useFactory?: (
    ...args: any[]
  ) => Promise<AmqpModuleOptions> | AmqpModuleOptions;
  inject?: any[];
}
