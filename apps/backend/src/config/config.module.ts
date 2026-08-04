import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';

/**
 * Global module: validates env once and exposes ConfigService everywhere.
 * Instantiated eagerly so a misconfigured environment fails the bootstrap.
 */
@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useFactory: () => ConfigService.create(),
    },
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
