import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Department, DepartmentSchema } from './department.schema';
import { Status, StatusSchema } from '../status/status.schema';
import { Site, SiteSchema } from '../site/site.schema';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Department.name, schema: DepartmentSchema },
      { name: Status.name, schema: StatusSchema },
      { name: Site.name, schema: SiteSchema },
    ]),
    forwardRef(() => UserModule),
  ],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}
