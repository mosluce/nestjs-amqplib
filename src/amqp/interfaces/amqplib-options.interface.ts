import { ModuleMetadata } from '@nestjs/common';

export interface AmqplibModuleOptions {
  url: string;
  isGlobal?: boolean;
}

export interface AmqplibModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  isGlobal?: boolean;
  useFactory?: (
    ...args: any[]
  ) => Promise<AmqplibModuleOptions> | AmqplibModuleOptions;
  inject?: any[];
}
