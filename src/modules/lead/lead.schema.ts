import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type LeadDocument = Lead & Document;

/** Метаданные запроса при создании лида с сайта: IP, User-Agent, железо и т.д. */
@Schema({ _id: false })
export class LeadSourceMeta {
  @Prop({ trim: true })
  ip?: string;

  @Prop({ trim: true })
  userAgent?: string;

  @Prop({ trim: true })
  referrer?: string;

  @Prop({ trim: true })
  screen?: string;

  @Prop({ trim: true })
  language?: string;

  @Prop({ trim: true })
  platform?: string;

  @Prop({ trim: true })
  timezone?: string;

  @Prop({ trim: true })
  deviceMemory?: string;

  @Prop({ trim: true })
  hardwareConcurrency?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  extra?: Record<string, unknown>;
}

export const LeadSourceMetaSchema = SchemaFactory.createForClass(LeadSourceMeta);

@Schema({ timestamps: true, collection: 'leads' })
export class Lead {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, default: '' })
  lastName: string;

  @Prop({ trim: true, default: '' })
  phone: string;

  @Prop({ trim: true, default: '' })
  phone2: string;

  @Prop({ trim: true, default: '' })
  email: string;

  @Prop({ trim: true, default: '' })
  email2: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  departmentId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Status', default: null })
  statusId: MongooseSchema.Types.ObjectId | null;

  @Prop({ trim: true, default: '' })
  comment: string;

  @Prop({ trim: true, default: 'manual' })
  source: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Site', default: null })
  siteId: MongooseSchema.Types.ObjectId | null;

  @Prop({ type: LeadSourceMetaSchema, default: undefined })
  sourceMeta?: LeadSourceMeta;

  @Prop({ required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'User', default: [] })
  assignedTo: MongooseSchema.Types.ObjectId[];
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
