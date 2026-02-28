import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeadTag, LeadTagSchema } from './lead-tag.schema';
import { LeadTagService } from './lead-tag.service';
import { LeadTagController } from './lead-tag.controller';
import { DepartmentModule } from '../department/department.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LeadTag.name, schema: LeadTagSchema }]),
    DepartmentModule,
    forwardRef(() => UserModule),
  ],
  controllers: [LeadTagController],
  providers: [LeadTagService],
  exports: [LeadTagService],
})
export class LeadTagModule {}
