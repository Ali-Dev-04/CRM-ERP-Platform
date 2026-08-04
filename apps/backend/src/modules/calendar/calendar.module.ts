import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [OrganizationsModule],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
