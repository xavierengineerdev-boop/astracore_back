import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lead, LeadSchema } from './lead.schema';
import { LeadNote, LeadNoteSchema } from './lead-note.schema';
import { LeadHistory, LeadHistorySchema } from './lead-history.schema';
import { LeadTask, LeadTaskSchema } from './lead-task.schema';
import { LeadReminder, LeadReminderSchema } from './lead-reminder.schema';
import { LeadService } from './lead.service';
import { LeadController } from './lead.controller';
import { DepartmentModule } from '../department/department.module';
import { UserModule } from '../user/user.module';
import { StatusModule } from '../status/status.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: LeadNote.name, schema: LeadNoteSchema },
      { name: LeadHistory.name, schema: LeadHistorySchema },
      { name: LeadTask.name, schema: LeadTaskSchema },
      { name: LeadReminder.name, schema: LeadReminderSchema },
    ]),
    DepartmentModule,
    forwardRef(() => UserModule),
    StatusModule,
  ],
  controllers: [LeadController],
  providers: [LeadService],
  exports: [LeadService],
})
export class LeadModule {}
