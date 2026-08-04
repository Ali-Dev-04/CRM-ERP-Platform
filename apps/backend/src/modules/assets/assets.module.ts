import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { OrganizationsModule } from '../organizations/organizations.module';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [OrganizationsModule, EmployeesModule],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}
