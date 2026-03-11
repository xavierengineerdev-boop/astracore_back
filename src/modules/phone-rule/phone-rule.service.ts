import { Injectable } from '@nestjs/common';
import { PHONE_RULES_SEED } from './phone-rule.seed';
import type { PhoneRule, PhoneNormalizeResult } from './phone-rule.types';

@Injectable()
export class PhoneRuleService {
  private readonly rules: PhoneRule[];
  /** Правила по dialCode (длинные коды первыми для корректного матча: 996 до 99) */
  private readonly rulesByDialCode: Map<string, PhoneRule[]>;

  constructor() {
    this.rules = [...PHONE_RULES_SEED].sort((a, b) => a.order - b.order);
    const byCode = new Map<string, PhoneRule[]>();
    for (const r of this.rules) {
      const code = r.dialCode;
      if (!byCode.has(code)) byCode.set(code, []);
      byCode.get(code)!.push(r);
    }
    this.rulesByDialCode = byCode;
  }

  /** Все правила (для фронта и выбора страны) */
  getAllRules(): PhoneRule[] {
    return this.rules;
  }

  /** Найти правило по коду страны */
  getRuleByCountryCode(countryCode: string): PhoneRule | undefined {
    return this.rules.find((r) => r.countryCode === countryCode);
  }

  /**
   * Определить, какой dial code подходит к началу цифр (самый длинный матч).
   * Сортируем коды по длине убыванию.
   */
  private matchDialCode(digits: string): { dialCode: string; rest: string } | null {
    const codes = Array.from(this.rulesByDialCode.keys()).sort((a, b) => b.length - a.length);
    for (const code of codes) {
      if (digits === code || digits.startsWith(code)) {
        return { dialCode: code, rest: digits.slice(code.length) };
      }
    }
    return null;
  }

  /**
   * Нормализует ввод: только цифры, приведение к формату с кодом страны.
   * 8 в начале (для РФ/КЗ) заменяется на 7.
   */
  normalize(phoneRaw: string | null | undefined): PhoneNormalizeResult {
    if (phoneRaw == null) return { normalized: '', countryCode: '', dialCode: '', valid: false };
    const digits = String(phoneRaw).replace(/\D/g, '');
    if (digits.length === 0) return { normalized: '', countryCode: '', dialCode: '', valid: false };

    let normalized = digits;
    const rules = this.rules;

    if (normalized.startsWith('8') && normalized.length === 11) {
      normalized = '7' + normalized.slice(1);
    } else if (
      normalized.length === 10 &&
      !normalized.startsWith('7') &&
      !normalized.startsWith('8') &&
      rules.some((r) => r.dialCode === '7')
    ) {
      normalized = '7' + normalized;
    } else if (normalized.length === 11 && normalized.startsWith('8')) {
      normalized = '7' + normalized.slice(1);
    }

    const matched = this.matchDialCode(normalized);
    if (matched) {
      const ruleList = this.rulesByDialCode.get(matched.dialCode) || [];
      const rule = ruleList[0];
      const full = matched.dialCode + matched.rest;
      const len = full.length;
      const valid = rule && len >= rule.minLength && len <= rule.maxLength && new RegExp(rule.pattern).test(full);
      return {
        normalized: full,
        countryCode: rule?.countryCode ?? '',
        dialCode: matched.dialCode,
        valid: valid ?? false,
      };
    }

    const ru = rules.find((r) => r.dialCode === '7');
    const valid = ru && new RegExp(ru.pattern).test(normalized);
    return {
      normalized,
      countryCode: ru?.countryCode ?? '',
      dialCode: normalized.startsWith('7') ? '7' : '',
      valid: valid ?? false,
    };
  }

  /**
   * Нормализует и валидирует. Для пустого ввода возвращает ''.
   * @throws Error если ввод непустой и не прошёл валидацию по ни одному правилу
   */
  normalizeAndValidate(phoneRaw: string | null | undefined): string {
    const result = this.normalize(phoneRaw);
    if (result.normalized.length === 0) return '';
    if (!result.valid) {
      const rule = result.countryCode ? this.getRuleByCountryCode(result.countryCode) : null;
      const hint = rule ? ` (${rule.name}: ${rule.example})` : '';
      throw new Error(`Некорректный номер телефона${hint}`);
    }
    return result.normalized;
  }

  /** Проверка по правилам: подходит ли номер под какое-либо правило */
  isValid(phoneNormalized: string): boolean {
    if (!phoneNormalized || !/^\d+$/.test(phoneNormalized)) return false;
    for (const rule of this.rules) {
      if (new RegExp(rule.pattern).test(phoneNormalized)) return true;
    }
    return false;
  }
}
