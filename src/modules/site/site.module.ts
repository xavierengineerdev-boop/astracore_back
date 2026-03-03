import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Site, SiteSchema } from './site.schema';
import { SiteService } from './site.service';
import { SiteController } from './site.controller';
import { SiteWidgetController } from './site-widget.controller';
import { DepartmentModule } from '../department/department.module';
import { UserModule } from '../user/user.module';
import { LeadTagModule } from '../lead-tag/lead-tag.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Site.name, schema: SiteSchema }]),
    DepartmentModule,
    LeadTagModule,
    forwardRef(() => UserModule),
  ],
  controllers: [SiteWidgetController, SiteController],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
