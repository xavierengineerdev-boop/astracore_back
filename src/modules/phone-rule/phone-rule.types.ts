/**
 * Правило формата телефона для страны.
 * Используется для нормализации, валидации и отображения.
 */
export type PhoneRule = {
  /** ISO 3166-1 alpha-2 (RU, KZ, KG, UA, ...) */
  countryCode: string;
  /** Название страны (для UI) */
  name: string;
  /** Код набора (без +): 7, 996, 380, ... */
  dialCode: string;
  /** Минимальная длина номера с кодом (только цифры) */
  minLength: number;
  /** Максимальная длина номера с кодом */
  maxLength: number;
  /** Регулярное выражение для валидации (строка, без флагов) */
  pattern: string;
  /** Пример: 79991234567 */
  example: string;
  /** Сегменты для отображения национальной части (без кода): напр. [3,3,2,2] → (XXX) XXX-XX-XX */
  nationalDisplaySegments?: number[];
  /** Порядок в списке (меньше — выше) */
  order: number;
};

export type PhoneNormalizeResult = {
  normalized: string;
  countryCode: string;
  dialCode: string;
  valid: boolean;
};
