import { Global, Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { UsageService } from './usage.service';
import { OrganizationsModule } from '../organizations/organizations.module';

@Global() // UsageService is consumed by ai, members, files modules
@Module({
  imports: [OrganizationsModule],
  controllers: [BillingController],
  providers: [UsageService, BillingService],
  exports: [UsageService],
})
export class BillingModule {}
