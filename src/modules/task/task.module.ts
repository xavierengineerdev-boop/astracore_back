import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './task.schema';
import { TaskStatus, TaskStatusSchema } from './task-status.schema';
import { TaskPriority, TaskPrioritySchema } from './task-priority.schema';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TaskStatusService } from './task-status.service';
import { TaskStatusController } from './task-status.controller';
import { TaskPriorityService } from './task-priority.service';
import { TaskPriorityController } from './task-priority.controller';
import { DepartmentModule } from '../department/department.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: TaskStatus.name, schema: TaskStatusSchema },
      { name: TaskPriority.name, schema: TaskPrioritySchema },
    ]),
    DepartmentModule,
    UserModule,
  ],
  controllers: [TaskController, TaskStatusController, TaskPriorityController],
  providers: [TaskService, TaskStatusService, TaskPriorityService],
  exports: [TaskService, TaskStatusService, TaskPriorityService],
})
export class TaskModule {}
