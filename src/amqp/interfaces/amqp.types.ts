export type AmqpModuleDelayFn = (ms: number) => Promise<void>;

export class AmqpModuleConsumOptions {
  queue: string;
  exchange?: string;
  exchangeType? = 'topic';
  routingKey?: string;
}

export class AmqpModuleEventNackOptions {
  requeue = false;
  allUpTo = false;
}
export class AmqpModuleEvent<Body = any, Meta = any> {
  ack: () => void;
  nack: (options: AmqpModuleEventNackOptions) => void;
  payload: Body;
  meta?: Meta;
}
