import { WinstonLoggerService } from '@ccmos/nestjs-winston-logger';
import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import * as amqplib from 'amqplib';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';
import { AMQPLIB_MODULE_OPTIONS } from './amqplib.constants';
import { AmqplibModuleOptions } from './interfaces';
import {
  AmqplibModuleConsumOptions,
  AmqplibModuleEvent,
} from './interfaces/amqplib.types';

@Injectable()
export class AmqplibService implements OnModuleInit {
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

  async sendToQueue(queue: string, payload: any) {
    const conn = await this.connection$
      .pipe(
        filter((conn) => !!conn),
        take(1),
      )
      .toPromise();

    const ch = await conn.createChannel();

    await ch.assertQueue(queue);

    ch.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
  }

  async publish(exchange: string, routingKey: string, payload: any) {
    const conn = await this.connection$
      .pipe(
        filter((conn) => !!conn),
        take(1),
      )
      .toPromise();

    const ch = await conn.createChannel();

    await ch.assertExchange(exchange, 'topic');

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
            const { queue, exchange, exchangeType, routingKey } = options;

            await ch.assertQueue(queue, { durable: true });

            if (exchange && routingKey) {
              await ch.assertExchange(exchange, exchangeType, {
                durable: true,
              });
              await ch.bindQueue(queue, exchange, routingKey);
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
              nack: (options) =>
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
