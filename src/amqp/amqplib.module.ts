import { DynamicModule, Module } from '@nestjs/common';
import { AMQPLIB_MODULE_OPTIONS } from './amqplib.constants';
import { AmqplibService } from './amqplib.service';
import { AmqplibModuleAsyncOptions, AmqplibModuleOptions } from './interfaces';

@Module({})
export class AmqplibModule {
  static forRoot(options: AmqplibModuleOptions): DynamicModule {
    const { isGlobal, ...useValue } = options;

    return {
      module: AmqplibModule,
      global: isGlobal,
      providers: [
        { provide: AMQPLIB_MODULE_OPTIONS, useValue },
        AmqplibService,
      ],
      exports: [AmqplibService],
    };
  }

  static forRootAsync(options: AmqplibModuleAsyncOptions): DynamicModule {
    return {
      module: AmqplibModule,
      global: options.isGlobal,
      imports: options.imports || [],
      providers: [
        {
          provide: AMQPLIB_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        AmqplibService,
      ],
      exports: [AmqplibService],
    };
  }
}
