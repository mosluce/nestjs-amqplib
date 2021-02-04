import { WinstonLoggerModule } from '@ccmos/nestjs-winston-logger';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { take } from 'rxjs/operators';
import { AMQPLIB_MODULE_OPTIONS } from './amqplib.constants';
import { AmqplibModule } from './amqplib.module';
import { AmqplibService } from './amqplib.service';

describe('AmqplibService', () => {
  let service: AmqplibService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [WinstonLoggerModule.forRoot({ level: 'debug' })],
      providers: [
        {
          provide: AMQPLIB_MODULE_OPTIONS,
          useFactory: () => ({ url: 'amqp://localhost:5673' }),
        },
        AmqplibService,
      ],
    }).compile();

    service = module.get<AmqplibService>(AmqplibService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('sendToQueue and consume', async () => {
    await service.connect();
    await service.sendToQueue({
      queue: 'testQueue',
      payload: { hello: 'queue' },
    });

    const event = await service
      .consume({ queue: 'testQueue' })
      .pipe(take(1))
      .toPromise();

    event.ack();
    await delay(100);

    await service.terminate();
  });

  it('publish and consume', async (done) => {
    await service.connect();

    service
      .consume({
        queue: 'testQueue',
        exchange: 'testExchange',
        routingKey: 'testRoutingKey',
      })
      .pipe(take(1))
      .subscribe(async (event) => {
        event.ack();
        await delay(500);

        await service.terminate();

        done();
      });

    await service.publish({
      exchange: 'testExchange',
      routingKey: 'testRoutingKey',
      payload: {
        hello: 'exchange',
      },
    });
  });
});

describe('import module', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        WinstonLoggerModule.forRoot({ level: 'debug', isGlobal: true }),
        AmqplibModule.forRoot({ url: 'amqp://localhost:5673' }),
      ],
    }).compile();

    app = module.createNestApplication();

    await app.init();
  });

  it('app should be defined', () => {
    expect(app).toBeDefined();
  });

  afterEach(() => app.close());
});

describe('import module async', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        WinstonLoggerModule.forRoot({ level: 'debug', isGlobal: true }),
        AmqplibModule.forRootAsync({
          useFactory: () => ({ url: 'amqp://localhost:5673' }),
        }),
      ],
    }).compile();

    app = module.createNestApplication();

    await app.init();
  });

  it('app should be defined', () => {
    expect(app).toBeDefined();
  });

  afterEach(() => app.close());
});

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}
