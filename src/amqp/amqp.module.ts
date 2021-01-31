import { DynamicModule, Module } from '@nestjs/common';
import { AMQP_MODULE_OPTIONS, AMQP_MODULE_UTIL_DELAY } from './amqp.constants';
import { AmqpService } from './amqp.service';
import { AmqpModuleAsyncOptions, AmqpModuleOptions } from './interfaces';

@Module({})
export class AmqpModule {
  static forRoot(options: AmqpModuleOptions): DynamicModule {
    const { isGlobal, ...useExisting } = options;

    return {
      module: AmqpModule,
      global: isGlobal,
      providers: [
        { provide: AMQP_MODULE_OPTIONS, useExisting },
        {
          provide: AMQP_MODULE_UTIL_DELAY,
          useFactory: () => (ms = 100) =>
            new Promise<void>((resolve) =>
              setTimeout(() => {
                resolve();
              }, ms),
            ),
        },
        AmqpService,
      ],
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
