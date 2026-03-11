import { Module } from '@nestjs/common';
import { PhoneRuleService } from './phone-rule.service';
import { PhoneRuleController } from './phone-rule.controller';

@Module({
  controllers: [PhoneRuleController],
  providers: [PhoneRuleService],
  exports: [PhoneRuleService],
})
export class PhoneRuleModule {}
