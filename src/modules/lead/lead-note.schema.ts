import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type LeadNoteDocument = LeadNote & Document;

@Schema({ timestamps: true, collection: 'lead_notes' })
export class LeadNote {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lead', required: true })
  leadId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  authorId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  content: string;
}

export const LeadNoteSchema = SchemaFactory.createForClass(LeadNote);
