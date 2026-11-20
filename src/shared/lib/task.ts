const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export type Task = {
  id: number;
  type: TaskStatus;
  startDay: number;
  endDay: number;
  text: string;
};

const MS_PER_UTC_DAY = 86_400_000;
const DATE_QUERY = /^(\d{2})\.(\d{2})\.(\d{4})$/;

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.some((status) => status === value);
}

function utcDayIndex(timestamp: number): number {
  return Math.floor(timestamp / MS_PER_UTC_DAY);
}

export function formatTaskDay(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear()).padStart(4, '0');

  return `${day}.${month}.${year}`;
}

function readGroup(groups: RegExpExecArray, index: number): number | undefined {
  const raw = groups[index];

  if (raw === undefined) {
    return undefined;
  }

  return Number(raw);
}

export type TaskDraft = {
  type: TaskStatus;
  startDay: number;
  endDay: number;
  text: string;
};

export function parseTaskDay(value: string): number | undefined {
  const match = DATE_QUERY.exec(value);

  if (match === null) {
    return undefined;
  }

  const day = readGroup(match, 1);
  const month = readGroup(match, 2);
  const year = readGroup(match, 3);

  if (day === undefined || month === undefined || year === undefined) {
    return undefined;
  }

  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }

  return timestamp;
}

function queryDayIndex(query: string): number | undefined {
  const timestamp = parseTaskDay(query);

  if (timestamp === undefined) {
    return undefined;
  }

  return utcDayIndex(timestamp);
}

export function readTaskDraft(input: {
  type: string;
  startDay: string;
  endDay: string;
  text: string;
}): TaskDraft | undefined {
  const text = input.text.trim();
  const startDay = parseTaskDay(input.startDay.trim());
  const endDay = parseTaskDay(input.endDay.trim());

  if (!isTaskStatus(input.type) || text === '' || startDay === undefined || endDay === undefined) {
    return undefined;
  }

  if (utcDayIndex(endDay) < utcDayIndex(startDay)) {
    return undefined;
  }

  return { type: input.type, startDay, endDay, text };
}

export function createTaskId(tasks: readonly { id: number }[]): number {
  return tasks.reduce((maxId, task) => Math.max(maxId, task.id), 0) + 1;
}

export function isTaskOverdue(task: Task, currentDate: number): boolean {
  return task.type !== 'done' && utcDayIndex(task.endDay) < utcDayIndex(currentDate);
}

export function sortTasksByStartDay(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((left, right) => left.startDay - right.startDay);
}

export function filterTasks(tasks: readonly Task[], query: string): Task[] {
  const trimmed = query.trim();

  if (trimmed === '') {
    return [...tasks];
  }

  const dayIndex = queryDayIndex(trimmed);

  if (dayIndex !== undefined) {
    return tasks.filter(
      (task) => utcDayIndex(task.startDay) === dayIndex || utcDayIndex(task.endDay) === dayIndex,
    );
  }

  const needle = trimmed.toLowerCase();

  return tasks.filter((task) => task.text.toLowerCase().includes(needle));
}
