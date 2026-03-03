import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SiteDocument = Site & Document;

@Schema({ timestamps: true, collection: 'sites' })
export class Site {
  @Prop({ required: true, trim: true })
  url: string;

  @Prop({ trim: true, default: '' })
  description: string;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  departmentId: MongooseSchema.Types.ObjectId;

  /** Тег источника лида: лиды с этого сайта получат этот тег */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'LeadTag', default: null })
  leadTagId: MongooseSchema.Types.ObjectId | null;
}

export const SiteSchema = SchemaFactory.createForClass(Site);
