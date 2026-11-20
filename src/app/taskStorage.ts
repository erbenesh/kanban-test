import { isTaskStatus, type Task } from '../shared/lib/task';

export const TASKS_STORAGE_KEY = 'kanban_tasks';

export type TaskStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function copyTasks(tasks: readonly Task[]): Task[] {
  return tasks.map((task) => ({ ...task }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function readStoredTask(value: unknown): Task | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = readFiniteNumber(value.id);
  const startDay = readFiniteNumber(value.startDay);
  const endDay = readFiniteNumber(value.endDay);
  const { text, type } = value;

  if (
    id === undefined ||
    startDay === undefined ||
    endDay === undefined ||
    typeof text !== 'string' ||
    typeof type !== 'string' ||
    !isTaskStatus(type)
  ) {
    return undefined;
  }

  return { id, type, startDay, endDay, text };
}

function readStoredTaskList(value: unknown): Task[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const tasks: Task[] = [];
  const seenIds = new Set<number>();

  for (const item of value) {
    const task = readStoredTask(item);

    if (task === undefined || seenIds.has(task.id)) {
      return undefined;
    }

    seenIds.add(task.id);
    tasks.push(task);
  }

  return tasks;
}

export function loadStoredTasks(storage: TaskStorage | null, seed: readonly Task[]): Task[] {
  if (storage === null) {
    return copyTasks(seed);
  }

  let raw: string | null;

  try {
    raw = storage.getItem(TASKS_STORAGE_KEY);
  } catch {
    return copyTasks(seed);
  }

  if (raw === null) {
    return copyTasks(seed);
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const stored = readStoredTaskList(parsed);

    if (stored === undefined) {
      return copyTasks(seed);
    }

    return stored;
  } catch {
    return copyTasks(seed);
  }
}

export function saveStoredTasks(storage: TaskStorage, tasks: readonly Task[]): void {
  try {
    storage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    return;
  }
}
