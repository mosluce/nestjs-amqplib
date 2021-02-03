export type AmqplibModuleDelayFn = (ms: number) => Promise<void>;

export class AmqplibModuleConsumOptions {
  queue: string;
  exchange?: string;
  exchangeType? = 'topic';
  routingKey?: string;
}

export class AmqplibModuleEventNackOptions {
  requeue = false;
  allUpTo = false;
}
export class AmqplibModuleEvent<Body = any, Meta = any> {
  ack: () => void;
  nack: (options: AmqplibModuleEventNackOptions) => void;
  payload: Body;
  meta?: Meta;
}
