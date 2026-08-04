import { Module } from '@nestjs/common';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { OrganizationsModule } from '../organizations/organizations.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [OrganizationsModule, InvoicesModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
})
export class QuotationsModule {}
