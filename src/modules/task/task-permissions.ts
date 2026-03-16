/**
 * Права доступа к задачам по role_id (блок 4.4 ТЗ).
 *
 * Правила:
 * - «Свои» задачи = assigneeId = текущий пользователь ИЛИ createdBy = текущий пользователь.
 *   Редактировать/удалять свою задачу может исполнитель (assignee) или автор (createdBy).
 * - «Отдел» = task.departmentId === user.departmentId (в БД есть departmentId у User и Task; team_id нет).
 *
 * Матрица видимости:
 * - employee (менеджер в ТЗ): видит только свои задачи (assignee или author).
 * - manager (руководитель в ТЗ): видит все задачи своего отдела (user.departmentId).
 * - admin, super (администратор в ТЗ): видит все задачи.
 */

import { UserRole } from '../../constants/roles.constant';

export type TaskLike = {
  departmentId: string;
  assigneeId: string | null;
  createdBy: string;
};

export type TaskUserContext = {
  userId: string;
  role: UserRole;
  departmentId: string | null | undefined;
};

function isOwnTask(task: TaskLike, userId: string): boolean {
  return (
    (task.assigneeId != null && String(task.assigneeId) === String(userId)) ||
    String(task.createdBy) === String(userId)
  );
}

function isInMyDepartment(task: TaskLike, userDepartmentId: string | null | undefined): boolean {
  if (!userDepartmentId) return false;
  return String(task.departmentId) === String(userDepartmentId);
}

/** Может ли пользователь видеть задачу (в списке или при GET по id). */
export function canViewTask(task: TaskLike, ctx: TaskUserContext): boolean {
  if (ctx.role === 'super' || ctx.role === 'admin') return true;
  if (ctx.role === 'manager') return isInMyDepartment(task, ctx.departmentId);
  if (ctx.role === 'employee') return isOwnTask(task, ctx.userId);
  return false;
}

/** Может ли пользователь редактировать задачу. */
export function canEditTask(task: TaskLike, ctx: TaskUserContext): boolean {
  if (ctx.role === 'super' || ctx.role === 'admin') return true;
  if (ctx.role === 'manager') return isInMyDepartment(task, ctx.departmentId);
  if (ctx.role === 'employee') return isOwnTask(task, ctx.userId);
  return false;
}

/** Может ли пользователь удалить задачу. */
export function canDeleteTask(task: TaskLike, ctx: TaskUserContext): boolean {
  return canEditTask(task, ctx);
}

/**
 * Может ли пользователь создавать задачу в указанном отделе.
 * employee — только в своём отделе; manager — только в своём; admin/super — в любом.
 */
export function canCreateTaskInDepartment(
  targetDepartmentId: string,
  ctx: TaskUserContext,
): boolean {
  if (ctx.role === 'super' || ctx.role === 'admin') return true;
  if (ctx.role === 'manager' && ctx.departmentId) {
    return String(targetDepartmentId) === String(ctx.departmentId);
  }
  if (ctx.role === 'employee' && ctx.departmentId) {
    return String(targetDepartmentId) === String(ctx.departmentId);
  }
  return false;
}

/**
 * Может ли пользователь запросить список задач по отделу и какие задачи вернуть.
 * Возвращает: { allowed: true } для admin/super (все задачи отдела);
 * { allowed: true, onlyOwn: true } для employee (только свои в этом отделе);
 * { allowed: true, departmentIdMustMatch: true } для manager (только если отдел = свой);
 * { allowed: false } если отдел не выбран или не совпадает (для manager).
 */
export function getListTasksScope(
  requestedDepartmentId: string | null,
  ctx: TaskUserContext,
): { allowed: boolean; onlyOwn?: boolean; departmentIdMustMatch?: string } {
  if (!requestedDepartmentId?.trim()) return { allowed: false };
  const dept = requestedDepartmentId.trim();
  if (ctx.role === 'super' || ctx.role === 'admin') return { allowed: true };
  if (ctx.role === 'manager') {
    if (!ctx.departmentId) return { allowed: false };
    if (String(dept) !== String(ctx.departmentId)) return { allowed: false };
    return { allowed: true, departmentIdMustMatch: String(ctx.departmentId) };
  }
  if (ctx.role === 'employee') {
    if (!ctx.departmentId) return { allowed: false };
    if (String(dept) !== String(ctx.departmentId)) return { allowed: false };
    return { allowed: true, onlyOwn: true };
  }
  return { allowed: false };
}

/** Может ли пользователь менять порядок задач в отделе (reorder). */
export function canReorderTasksInDepartment(
  departmentId: string,
  ctx: TaskUserContext,
): boolean {
  if (ctx.role === 'super' || ctx.role === 'admin') return true;
  if (ctx.role === 'manager' && ctx.departmentId) {
    return String(departmentId) === String(ctx.departmentId);
  }
  return false;
}
