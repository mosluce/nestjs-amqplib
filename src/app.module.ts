import { Module } from '@nestjs/common';
import { AmqplibModule } from './amqp/amqplib.module';

@Module({
  imports: [AmqplibModule.forRoot({ url: 'amqp://localhost:5673' })],
  controllers: [],
  providers: [],
})
export class AppModule {}
