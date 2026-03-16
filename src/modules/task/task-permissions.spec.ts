/**
 * Тесты прав доступа к задачам по ролям (блок 4.4 ТЗ).
 * Роли: employee (свои), manager (отдел), admin/super (все).
 * Негативные кейсы: чужая задача, другой отдел, без отдела.
 */

import {
  canViewTask,
  canEditTask,
  canDeleteTask,
  canCreateTaskInDepartment,
  getListTasksScope,
  canReorderTasksInDepartment,
  type TaskLike,
  type TaskUserContext,
} from './task-permissions';

const DEPT_A = 'dept-a-id';
const DEPT_B = 'dept-b-id';
const USER_1 = 'user-1-id';
const USER_2 = 'user-2-id';

function task(overrides: Partial<TaskLike> = {}): TaskLike {
  return {
    departmentId: DEPT_A,
    assigneeId: USER_1,
    createdBy: USER_1,
    ...overrides,
  };
}

function ctx(overrides: Partial<TaskUserContext> = {}): TaskUserContext {
  return {
    userId: USER_1,
    role: 'employee',
    departmentId: DEPT_A,
    ...overrides,
  };
}

describe('task-permissions', () => {
  describe('canViewTask', () => {
    it('admin видит любую задачу', () => {
      expect(canViewTask(task({ departmentId: DEPT_B, assigneeId: USER_2, createdBy: USER_2 }), ctx({ role: 'admin' }))).toBe(true);
    });
    it('super видит любую задачу', () => {
      expect(canViewTask(task({ departmentId: DEPT_B }), ctx({ role: 'super' }))).toBe(true);
    });
    it('manager видит задачу своего отдела', () => {
      expect(canViewTask(task({ departmentId: DEPT_A }), ctx({ role: 'manager', departmentId: DEPT_A }))).toBe(true);
    });
    it('manager не видит задачу чужого отдела', () => {
      expect(canViewTask(task({ departmentId: DEPT_B }), ctx({ role: 'manager', departmentId: DEPT_A }))).toBe(false);
    });
    it('manager без отдела не видит задачу', () => {
      expect(canViewTask(task(), ctx({ role: 'manager', departmentId: null }))).toBe(false);
    });
    it('employee видит свою задачу (assignee)', () => {
      expect(canViewTask(task({ assigneeId: USER_1, createdBy: USER_2 }), ctx())).toBe(true);
    });
    it('employee видит свою задачу (author)', () => {
      expect(canViewTask(task({ assigneeId: null, createdBy: USER_1 }), ctx())).toBe(true);
    });
    it('employee не видит чужую задачу', () => {
      expect(canViewTask(task({ assigneeId: USER_2, createdBy: USER_2 }), ctx())).toBe(false);
    });
  });

  describe('canEditTask / canDeleteTask', () => {
    it('admin может редактировать и удалять любую задачу', () => {
      const t = task({ departmentId: DEPT_B, assigneeId: USER_2, createdBy: USER_2 });
      expect(canEditTask(t, ctx({ role: 'admin' }))).toBe(true);
      expect(canDeleteTask(t, ctx({ role: 'admin' }))).toBe(true);
    });
    it('manager может редактировать задачу своего отдела', () => {
      const t = task({ departmentId: DEPT_A });
      expect(canEditTask(t, ctx({ role: 'manager', departmentId: DEPT_A }))).toBe(true);
      expect(canDeleteTask(t, ctx({ role: 'manager', departmentId: DEPT_A }))).toBe(true);
    });
    it('manager не может редактировать задачу чужого отдела', () => {
      const t = task({ departmentId: DEPT_B });
      expect(canEditTask(t, ctx({ role: 'manager', departmentId: DEPT_A }))).toBe(false);
      expect(canDeleteTask(t, ctx({ role: 'manager', departmentId: DEPT_A }))).toBe(false);
    });
    it('employee может редактировать задачу, где он assignee', () => {
      const t = task({ assigneeId: USER_1, createdBy: USER_2 });
      expect(canEditTask(t, ctx())).toBe(true);
      expect(canDeleteTask(t, ctx())).toBe(true);
    });
    it('employee может редактировать задачу, где он author', () => {
      const t = task({ assigneeId: USER_2, createdBy: USER_1 });
      expect(canEditTask(t, ctx())).toBe(true);
      expect(canDeleteTask(t, ctx())).toBe(true);
    });
    it('employee не может редактировать чужую задачу', () => {
      const t = task({ assigneeId: USER_2, createdBy: USER_2 });
      expect(canEditTask(t, ctx())).toBe(false);
      expect(canDeleteTask(t, ctx())).toBe(false);
    });
  });

  describe('canCreateTaskInDepartment', () => {
    it('admin может создавать задачу в любом отделе', () => {
      expect(canCreateTaskInDepartment(DEPT_A, ctx({ role: 'admin' }))).toBe(true);
      expect(canCreateTaskInDepartment(DEPT_B, ctx({ role: 'admin' }))).toBe(true);
    });
    it('super может создавать в любом отделе', () => {
      expect(canCreateTaskInDepartment(DEPT_B, ctx({ role: 'super' }))).toBe(true);
    });
    it('manager может создавать только в своём отделе', () => {
      expect(canCreateTaskInDepartment(DEPT_A, ctx({ role: 'manager', departmentId: DEPT_A }))).toBe(true);
      expect(canCreateTaskInDepartment(DEPT_B, ctx({ role: 'manager', departmentId: DEPT_A }))).toBe(false);
    });
    it('manager без отдела не может создавать', () => {
      expect(canCreateTaskInDepartment(DEPT_A, ctx({ role: 'manager', departmentId: null }))).toBe(false);
    });
    it('employee может создавать только в своём отделе', () => {
      expect(canCreateTaskInDepartment(DEPT_A, ctx({ role: 'employee', departmentId: DEPT_A }))).toBe(true);
      expect(canCreateTaskInDepartment(DEPT_B, ctx({ role: 'employee', departmentId: DEPT_A }))).toBe(false);
    });
    it('employee без отдела не может создавать', () => {
      expect(canCreateTaskInDepartment(DEPT_A, ctx({ role: 'employee', departmentId: null }))).toBe(false);
    });
  });

  describe('getListTasksScope', () => {
    it('admin/super: доступ к любому отделу, все задачи', () => {
      const scopeAdmin = getListTasksScope(DEPT_A, ctx({ role: 'admin' }));
      expect(scopeAdmin.allowed).toBe(true);
      expect(scopeAdmin.onlyOwn).toBeUndefined();
      const scopeSuper = getListTasksScope(DEPT_B, ctx({ role: 'super' }));
      expect(scopeSuper.allowed).toBe(true);
    });
    it('manager: доступ только к своему отделу', () => {
      const scopeOk = getListTasksScope(DEPT_A, ctx({ role: 'manager', departmentId: DEPT_A }));
      expect(scopeOk.allowed).toBe(true);
      const scopeNo = getListTasksScope(DEPT_B, ctx({ role: 'manager', departmentId: DEPT_A }));
      expect(scopeNo.allowed).toBe(false);
    });
    it('manager без отдела: нет доступа', () => {
      expect(getListTasksScope(DEPT_A, ctx({ role: 'manager', departmentId: null })).allowed).toBe(false);
    });
    it('employee: доступ только к своему отделу, только свои задачи', () => {
      const scopeOk = getListTasksScope(DEPT_A, ctx({ role: 'employee', departmentId: DEPT_A }));
      expect(scopeOk.allowed).toBe(true);
      expect(scopeOk.onlyOwn).toBe(true);
      expect(getListTasksScope(DEPT_B, ctx({ role: 'employee', departmentId: DEPT_A })).allowed).toBe(false);
    });
    it('employee без отдела: нет доступа', () => {
      expect(getListTasksScope(DEPT_A, ctx({ role: 'employee', departmentId: null })).allowed).toBe(false);
    });
    it('пустой departmentId: нет доступа', () => {
      expect(getListTasksScope('', ctx({ role: 'admin' })).allowed).toBe(false);
      expect(getListTasksScope(null as any, ctx({ role: 'admin' })).allowed).toBe(false);
    });
  });

  describe('canReorderTasksInDepartment', () => {
    it('admin/super может менять порядок в любом отделе', () => {
      expect(canReorderTasksInDepartment(DEPT_A, ctx({ role: 'admin' }))).toBe(true);
      expect(canReorderTasksInDepartment(DEPT_B, ctx({ role: 'super' }))).toBe(true);
    });
    it('manager может менять порядок только в своём отделе', () => {
      expect(canReorderTasksInDepartment(DEPT_A, ctx({ role: 'manager', departmentId: DEPT_A }))).toBe(true);
      expect(canReorderTasksInDepartment(DEPT_B, ctx({ role: 'manager', departmentId: DEPT_A }))).toBe(false);
    });
    it('employee не может менять порядок', () => {
      expect(canReorderTasksInDepartment(DEPT_A, ctx({ role: 'employee', departmentId: DEPT_A }))).toBe(false);
    });
  });
});
