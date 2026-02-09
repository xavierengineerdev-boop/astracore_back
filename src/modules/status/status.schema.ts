import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type StatusDocument = Status & Document;

@Schema({ timestamps: true, collection: 'statuses' })
export class Status {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, default: '' })
  description: string;

  @Prop({ trim: true, default: '#9ca3af' })
  color: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true })
  departmentId: MongooseSchema.Types.ObjectId;

  @Prop({ default: 0 })
  order: number;
}

export const StatusSchema = SchemaFactory.createForClass(Status);
