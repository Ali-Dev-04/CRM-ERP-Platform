import { Module } from '@nestjs/common';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [OrganizationsModule, CalendarModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
})
export class MeetingsModule {}
