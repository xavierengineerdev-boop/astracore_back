import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type LeadCommentDocument = LeadComment & Document;

@Schema({ timestamps: true, collection: 'lead_comments' })
export class LeadComment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lead', required: true })
  leadId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  authorId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  content: string;
}

export const LeadCommentSchema = SchemaFactory.createForClass(LeadComment);
