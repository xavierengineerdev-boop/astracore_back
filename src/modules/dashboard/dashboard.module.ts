import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lead, LeadSchema } from '../lead/lead.schema';
import { Status, StatusSchema } from '../status/status.schema';
import { LeadReminder, LeadReminderSchema } from '../lead/lead-reminder.schema';
import { LeadTask, LeadTaskSchema } from '../lead/lead-task.schema';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DepartmentModule } from '../department/department.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: Status.name, schema: StatusSchema },
      { name: LeadReminder.name, schema: LeadReminderSchema },
      { name: LeadTask.name, schema: LeadTaskSchema },
    ]),
    DepartmentModule,
    UserModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
