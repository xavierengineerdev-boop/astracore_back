/**
 * Дефолтные статусы и приоритеты задачника для отдела (при первом открытии доски).
 */

export const DEFAULT_TASK_STATUSES: { name: string; color: string; isCompleted: boolean }[] = [
  { name: 'В ожидании', color: '#94a3b8', isCompleted: false },
  { name: 'Новые задача', color: '#3b82f6', isCompleted: false },
  { name: 'Проверка', color: '#8b5cf6', isCompleted: false },
  { name: 'Тестировка', color: '#06b6d4', isCompleted: false },
  { name: 'Просрочено', color: '#ef4444', isCompleted: false },
  { name: 'В работе', color: '#f59e0b', isCompleted: false },
  { name: 'Block', color: '#64748b', isCompleted: false },
  { name: 'Выполнено', color: '#22c55e', isCompleted: true },
];

export const DEFAULT_TASK_PRIORITIES: { name: string; color: string }[] = [
  { name: 'Low', color: '#6b7280' },
  { name: 'Medium', color: '#3b82f6' },
  { name: 'High', color: '#f59e0b' },
  { name: 'Fire', color: '#ef4444' },
];
