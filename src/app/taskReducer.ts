import type { Task, TaskStatus } from '../shared/lib/task';

export type TaskChanges = Partial<Omit<Task, 'id'>>;

export type TaskAction =
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'UPDATE_TASK'; id: number; changes: TaskChanges }
  | { type: 'DELETE_TASK'; id: number }
  | { type: 'MOVE_TASK'; id: number; status: TaskStatus };

function findTaskIndex(tasks: readonly Task[], id: number): number {
  return tasks.findIndex((task) => task.id === id);
}

function sameTasks(tasks: readonly Task[]): Task[] {
  return tasks as Task[];
}

function replaceTask(tasks: readonly Task[], index: number, next: Task): Task[] {
  return tasks.map((task, taskIndex) => (taskIndex === index ? next : task));
}

function applyChanges(task: Task, changes: TaskChanges): Task {
  return {
    id: task.id,
    type: changes.type ?? task.type,
    startDay: changes.startDay ?? task.startDay,
    endDay: changes.endDay ?? task.endDay,
    text: changes.text ?? task.text,
  };
}

function hasSameFields(left: Task, right: Task): boolean {
  return (
    left.type === right.type &&
    left.startDay === right.startDay &&
    left.endDay === right.endDay &&
    left.text === right.text
  );
}

export function taskReducer(tasks: readonly Task[], action: TaskAction): Task[] {
  switch (action.type) {
    case 'ADD_TASK': {
      if (tasks.some((task) => task.id === action.task.id)) {
        return sameTasks(tasks);
      }

      return [...tasks, { ...action.task }];
    }
    case 'UPDATE_TASK': {
      const index = findTaskIndex(tasks, action.id);
      const current = index === -1 ? undefined : tasks[index];

      if (current === undefined) {
        return sameTasks(tasks);
      }

      const next = applyChanges(current, action.changes);

      if (hasSameFields(current, next)) {
        return sameTasks(tasks);
      }

      return replaceTask(tasks, index, next);
    }
    case 'DELETE_TASK': {
      const index = findTaskIndex(tasks, action.id);

      if (index === -1) {
        return sameTasks(tasks);
      }

      return tasks.filter((task) => task.id !== action.id);
    }
    case 'MOVE_TASK': {
      const index = findTaskIndex(tasks, action.id);
      const current = index === -1 ? undefined : tasks[index];

      if (current === undefined || current.type === action.status) {
        return sameTasks(tasks);
      }

      return replaceTask(tasks, index, { ...current, type: action.status });
    }
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}
