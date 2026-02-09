import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type LeadReminderDocument = LeadReminder & Document;

@Schema({ timestamps: true, collection: 'lead_reminders' })
export class LeadReminder {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lead', required: true })
  leadId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  remindAt: Date;

  @Prop({ default: false })
  done: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;
}

export const LeadReminderSchema = SchemaFactory.createForClass(LeadReminder);
