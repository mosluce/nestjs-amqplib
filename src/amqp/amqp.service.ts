import { WinstonLoggerService } from '@ccmos/nestjs-winston-logger';
import { Inject, Injectable } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { AMQP_MODULE_UTIL_DELAY } from './amqp.constants';
import { AmqpModuleOptions } from './interfaces';
import {
  AmqpModuleConsumOptions,
  AmqpModuleDelayFn,
  AmqpModuleEvent,
} from './interfaces/amqp.types';

@Injectable()
export class AmqpService {
  currentConn: amqp.AmqpConnectionManager;

  connection$ = new BehaviorSubject<amqp.AmqpConnectionManager>(null);
  channelWrapper$ = new BehaviorSubject<amqp.ChannelWrapper>(null);

  constructor(
    @Inject(AMQP_MODULE_UTIL_DELAY) private delay: AmqpModuleDelayFn,

    private options: AmqpModuleOptions,
    private logger?: WinstonLoggerService,
  ) {
    this.connect();

    this.connection$
      .pipe(filter((conn) => !!conn))
      .subscribe(this.createChannel.bind(this));
  }

  async sendToQueue(queue: string, payload: any) {
    return this.connection$
      .pipe(
        filter((ch) => !!ch),
        take(1),
        map((conn) =>
          conn.createChannel({
            json: true,
            setup: async (ch: ConfirmChannel) => {
              await ch.assertQueue(queue);
            },
          }),
        ),
      )
      .toPromise()
      .then((ch) =>
        Promise.all([
          ch.waitForConnect(),
          ch.sendToQueue(queue, payload, {
            contentType: 'application/json',
            persistent: true,
          }),
        ]),
      );
  }

  async publish(exchange: string, routingKey: string, payload: any) {
    return this.connection$
      .pipe(
        filter((ch) => !!ch),
        take(1),
        map((conn) =>
          conn.createChannel({
            json: true,
            setup: async (ch: ConfirmChannel) => {
              await ch.assertExchange(exchange, 'topic');
            },
          }),
        ),
      )
      .toPromise()
      .then((ch) =>
        Promise.all([
          ch.waitForConnect(),
          ch.publish(exchange, routingKey, payload, {
            contentType: 'application/json',
            persistent: true,
          }),
        ]),
      );
  }

  consume<Body = any, Meta = any>(options: AmqpModuleConsumOptions) {
    return this.channelWrapper$.pipe(
      filter((ch) => !!ch),
      switchMap((ch) => {
        const { queue, exchange, exchangeType, routingKey } = options;

        return new Observable<AmqpModuleEvent<Body, Meta>>((observer) => {
          ch.addSetup(async (ch: ConfirmChannel) => {
            await ch.assertQueue(queue);

            if (exchange && routingKey) {
              await ch.assertExchange(exchange, exchangeType);
              await ch.bindExchange(exchange, queue, routingKey);
            }

            ch.consume(options.queue, (message: any) => {
              const { content, ...meta } = message;
              const event: AmqpModuleEvent<Body, Meta> = {
                payload: JSON.parse(content.toString()),
                meta: meta as any,
                ack: () => ch.ack(message),
                nack: (options) =>
                  ch.nack(message, options.allUpTo, options.requeue),
              };

              observer.next(event);
            });
          });
        });
      }),
    );
  }

  private async connect() {
    const conn = amqp.connect(this.options.urls);

    conn.on('disconnect', this.onConnectionError.bind(this));
    conn.on('connect', () => this.connection$.next(conn));

    return conn;
  }

  private async createChannel(conn: amqp.AmqpConnectionManager) {
    const chw = conn.createChannel({
      json: true,
    });

    chw.on('connect', () => this.channelWrapper$.next(chw));
    chw.on('error', this.onChannelError.bind(this));
    chw.on('close', this.onChannelClose.bind(this));
  }

  private async onConnectionError(error: Error) {
    this.logger?.error('connection.error', {
      error: { message: error.message },
    });

    this.channelWrapper$.next(null);
    this.connection$.next(null);

    await this.connect();
  }

  private async onChannelError(error: Error) {
    this.logger?.error('channel.error', {
      error: { message: error.message },
    });
  }

  private async onChannelClose() {
    this.logger?.error('channel.close', {});
  }
}
