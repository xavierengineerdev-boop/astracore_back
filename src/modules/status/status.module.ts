import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Status, StatusSchema } from './status.schema';
import { StatusService } from './status.service';
import { StatusController } from './status.controller';
import { DepartmentModule } from '../department/department.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Status.name, schema: StatusSchema }]),
    DepartmentModule,
    forwardRef(() => UserModule),
  ],
  controllers: [StatusController],
  providers: [StatusService],
  exports: [StatusService],
})
export class StatusModule {}
