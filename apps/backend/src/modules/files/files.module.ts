import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { OrganizationsModule } from '../organizations/organizations.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [OrganizationsModule, DocumentsModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
