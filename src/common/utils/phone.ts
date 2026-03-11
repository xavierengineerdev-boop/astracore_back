/**
 * Нормализация телефона по ТЗ: формат 77999111222 (11 цифр, код 7).
 * - Удалить все символы кроме цифр.
 * - Если начинается с 8 → заменить на 7.
 * - Если без кода (10 цифр) → добавить 7.
 */

const PHONE_LENGTH = 11;
const COUNTRY_CODE = '7';

/**
 * Нормализует сырую строку телефона в формат 7XXXXXXXXXX.
 * @param phoneRaw — ввод пользователя (с пробелами, +, скобками и т.д.)
 * @returns нормализованная строка (11 цифр, начинается с 7) или пустая строка для пустого ввода
 */
export function normalizePhone(phoneRaw: string | null | undefined): string {
  if (phoneRaw == null) return '';
  const digits = String(phoneRaw).replace(/\D/g, '');
  if (digits.length === 0) return '';
  let normalized = digits;
  if (normalized.startsWith('8') && normalized.length === 11) {
    normalized = COUNTRY_CODE + normalized.slice(1);
  } else if (normalized.length === 10 && !normalized.startsWith('7') && !normalized.startsWith('8')) {
    normalized = COUNTRY_CODE + normalized;
  } else if (normalized.length === 11 && normalized.startsWith('8')) {
    normalized = COUNTRY_CODE + normalized.slice(1);
  }
  return normalized;
}

/**
 * Проверяет, что нормализованный номер допустим: 11 цифр, начинается с 7.
 */
export function isValidNormalizedPhone(value: string): boolean {
  return /^7\d{10}$/.test(value);
}

/**
 * Нормализует и валидирует телефон. Для пустого ввода возвращает ''.
 * @throws Error с сообщением, если ввод непустой и после нормализации номер невалиден
 */
export function normalizeAndValidatePhone(phoneRaw: string | null | undefined): string {
  const normalized = normalizePhone(phoneRaw);
  if (normalized.length === 0) return '';
  if (!isValidNormalizedPhone(normalized)) {
    throw new Error(
      `Некорректный номер телефона. Ожидается формат: 7XXXXXXXXXX (11 цифр, например 79991234567)`,
    );
  }
  return normalized;
}
