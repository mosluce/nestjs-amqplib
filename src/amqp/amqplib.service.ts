import { WinstonLoggerService } from '@ccmos/nestjs-winston-logger';
import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import * as amqplib from 'amqplib';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';
import { AMQPLIB_MODULE_OPTIONS } from './amqplib.constants';
import { AmqplibModuleOptions } from './interfaces';
import {
  AmqplibModuleConsumOptions,
  AmqplibModuleEvent,
  AmqplibModulePublishOptions,
  AmqplibModuleSendToQueueOptions,
} from './interfaces/amqplib.types';

@Injectable()
export class AmqplibService implements OnModuleInit, OnModuleDestroy {
  currentConnection: amqplib.Connection;
  terminated = false;

  connection$ = new BehaviorSubject<amqplib.Connection>(null);

  constructor(
    @Inject(AMQPLIB_MODULE_OPTIONS)
    private options: AmqplibModuleOptions,
    @Optional() private logger?: WinstonLoggerService,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.terminate();
  }

  async sendToQueue(options: AmqplibModuleSendToQueueOptions) {
    const { payload, queue, assertQueueOptions = { durable: true } } = options;

    const conn = await this.connection$
      .pipe(
        filter((conn) => !!conn),
        take(1),
      )
      .toPromise();

    const ch = await conn.createChannel();

    await ch.assertQueue(queue, assertQueueOptions);

    ch.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
  }

  async publish(options: AmqplibModulePublishOptions) {
    const {
      exchange,
      exchangeType = 'topic',
      payload,
      routingKey,
      exchangQueueOptions = { durable: true },
    } = options;

    const conn = await this.connection$
      .pipe(
        filter((conn) => !!conn),
        take(1),
      )
      .toPromise();

    const ch = await conn.createChannel();

    await ch.assertExchange(exchange, exchangeType, exchangQueueOptions);

    ch.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
  }

  consume<Body = any, Meta = any>(options: AmqplibModuleConsumOptions) {
    return this.connection$.pipe(
      filter((conn) => !!conn),
      switchMap((conn) =>
        from(
          (async () => {
            const ch = await conn.createChannel();
            const {
              queue,
              exchange,
              exchangeType = 'topic',
              routingKey,
              bindOptions = {},
              assertQueueOptions = { durable: true },
              exchangQueueOptions = { durable: true },
            } = options;

            await ch.assertQueue(queue, exchangQueueOptions);

            if (exchange && routingKey) {
              await ch.assertExchange(
                exchange,
                exchangeType,
                assertQueueOptions,
              );
              await ch.bindQueue(queue, exchange, routingKey, bindOptions);
            }

            return ch;
          })(),
        ),
      ),
      switchMap((ch) => {
        const { queue } = options;

        return new Observable<AmqplibModuleEvent<Body, Meta>>((observer) => {
          ch.consume(queue, (message: any) => {
            const { content, ...meta } = message;
            const event: AmqplibModuleEvent<Body, Meta> = {
              payload: JSON.parse(content.toString()),
              meta: meta as any,
              ack: () => ch.ack(message),
              nack: (options = { requeue: false, allUpTo: false }) =>
                ch.nack(message, options.allUpTo, options.requeue),
            };
            observer.next(event);
          });
        });
      }),
    );
  }

  async connect() {
    const conn = await amqplib.connect(this.options.url);

    conn.on('error', this.onConnectionError.bind(this));
    conn.on('close', this.onConnectionClose.bind(this));

    this.currentConnection = conn;
    this.connection$.next(conn);

    return conn;
  }

  async terminate() {
    this.terminated = true;

    await this.currentConnection?.close();
  }

  private async onConnectionError(error: Error) {
    this.logger?.warn('connection.error', {
      error: { message: error.message },
    });
  }

  private async onConnectionClose() {
    this.connection$.next(null);

    if (!this.terminated) {
      await this.connect();
    }
  }
}
