import { Options } from 'amqplib';

export type AmqplibModuleDelayFn = (ms: number) => Promise<void>;

export interface AmqplibModuleConsumOptions {
  queue: string;
  exchange?: string;
  exchangeType?: 'topic' | 'direct';
  routingKey?: string;
  assertQueueOptions?: Options.AssertQueue;
  assertExchangOptions?: Options.AssertExchange;
  bindOptions?: any;
}

export interface AmqplibModulePublishOptions {
  exchange: string;
  exchangeType?: 'topic' | 'direct';
  routingKey: string;
  payload: any;
  exchangQueueOptions?: Options.AssertExchange;
}

export interface AmqplibModuleSendToQueueOptions {
  queue: string;
  payload: any;
  assertQueueOptions?: Options.AssertQueue;
}

export interface AmqplibModuleEventNackOptions {
  requeue?: boolean;
  allUpTo?: boolean;
}
export interface AmqplibModuleEvent<Body = any, Meta = any> {
  ack: () => void;
  nack: (options?: AmqplibModuleEventNackOptions) => void;
  payload: Body;
  meta?: Meta;
}
