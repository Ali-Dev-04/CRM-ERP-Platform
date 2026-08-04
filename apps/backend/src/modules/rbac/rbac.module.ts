import { Global, Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { PermissionsGuard } from './permissions.guard';
import { RbacBootstrapService } from './rbac-bootstrap.service';

@Global()
@Module({
  providers: [RbacService, PermissionsGuard, RbacBootstrapService],
  exports: [RbacService, PermissionsGuard],
})
export class RbacModule {}
