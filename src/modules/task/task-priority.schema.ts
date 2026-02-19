import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TaskPriorityDocument = TaskPriority & Document;

@Schema({ timestamps: true, collection: 'task_priorities' })
export class TaskPriority {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, default: '#9ca3af' })
  color: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  departmentId: MongooseSchema.Types.ObjectId;
}

export const TaskPrioritySchema = SchemaFactory.createForClass(TaskPriority);
