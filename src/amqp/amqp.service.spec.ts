import { WinstonLoggerModule } from '@ccmos/nestjs-winston-logger';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AMQP_MODULE_OPTIONS } from './amqp.constants';
import { AmqpModule } from './amqp.module';
import { AmqpService } from './amqp.service';

describe('AmqpService', () => {
  let service: AmqpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [WinstonLoggerModule.forRoot({ level: 'debug' })],
      providers: [
        {
          provide: AMQP_MODULE_OPTIONS,
          useFactory: () => ({ urls: ['amqp://localhost'] }),
        },
        AmqpService,
      ],
    }).compile();

    service = module.get<AmqpService>(AmqpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('sendToQueue', () => {
    return service.sendToQueue('test', { hello: 'queue' });
  });

  it('publish', () => {
    return service.publish('test', 'test', { hello: 'exchange' });
  });
});

describe('import module', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        WinstonLoggerModule.forRoot({ level: 'debug', isGlobal: true }),
        AmqpModule.forRoot({ urls: ['amqp://localhost'] }),
      ],
    }).compile();

    app = module.createNestApplication();
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
        AmqpModule.forRootAsync({
          useFactory: () => ({ urls: ['amqp://localhost'] }),
        }),
      ],
    }).compile();

    app = module.createNestApplication();
  });

  it('app should be defined', () => {
    expect(app).toBeDefined();
  });

  afterEach(() => app.close());
});
