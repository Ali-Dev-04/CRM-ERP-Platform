import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrganizationsModule } from '../organizations/organizations.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [OrganizationsModule, InvoicesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
