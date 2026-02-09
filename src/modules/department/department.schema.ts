import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type DepartmentDocument = Department & Document;

@Schema({ timestamps: true, collection: 'departments' })
export class Department {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  managerId?: MongooseSchema.Types.ObjectId;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
