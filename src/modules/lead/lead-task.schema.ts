import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type LeadTaskDocument = LeadTask & Document;

@Schema({ timestamps: true, collection: 'lead_tasks' })
export class LeadTask {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lead', required: true })
  leadId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Date, default: null })
  dueAt: Date | null;

  @Prop({ default: false })
  completed: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;
}

export const LeadTaskSchema = SchemaFactory.createForClass(LeadTask);
