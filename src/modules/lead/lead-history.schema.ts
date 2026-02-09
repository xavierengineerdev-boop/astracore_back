import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type LeadHistoryDocument = LeadHistory & Document;

export type LeadHistoryAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'assigned'
  | 'note_added'
  | 'note_edited'
  | 'note_deleted'
  | 'task_added'
  | 'task_updated'
  | 'task_deleted'
  | 'reminder_added'
  | 'reminder_done'
  | 'reminder_deleted';

@Schema({ timestamps: true, collection: 'lead_history' })
export class LeadHistory {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lead', required: true })
  leadId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  action: LeadHistoryAction;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  meta: Record<string, unknown>;
}

export const LeadHistorySchema = SchemaFactory.createForClass(LeadHistory);
LeadHistorySchema.index({ leadId: 1, createdAt: 1 });
