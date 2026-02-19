import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TaskStatusDocument = TaskStatus & Document;

@Schema({ timestamps: true, collection: 'task_statuses' })
export class TaskStatus {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, default: '#9ca3af' })
  color: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  departmentId: MongooseSchema.Types.ObjectId;
}

export const TaskStatusSchema = SchemaFactory.createForClass(TaskStatus);
