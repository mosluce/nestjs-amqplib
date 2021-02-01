import { DynamicModule, Module } from '@nestjs/common';
import { AMQP_MODULE_OPTIONS } from './amqp.constants';
import { AmqpService } from './amqp.service';
import { AmqpModuleAsyncOptions, AmqpModuleOptions } from './interfaces';

@Module({})
export class AmqpModule {
  static forRoot(options: AmqpModuleOptions): DynamicModule {
    const { isGlobal, ...useValue } = options;

    return {
      module: AmqpModule,
      global: isGlobal,
      providers: [{ provide: AMQP_MODULE_OPTIONS, useValue }, AmqpService],
      exports: [AmqpService],
    };
  }

  static forRootAsync(options: AmqpModuleAsyncOptions): DynamicModule {
    return {
      module: AmqpModule,
      global: options.isGlobal,
      imports: options.imports || [],
      providers: [
        {
          provide: AMQP_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        AmqpService,
      ],
      exports: [AmqpService],
    };
  }
}
