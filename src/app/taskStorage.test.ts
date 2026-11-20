import { describe, expect, it } from 'vitest';
import type { Task } from '../shared/lib/task';
import { commitTaskAction } from './TaskContext';
import { TASKS_STORAGE_KEY, loadStoredTasks, saveStoredTasks, type TaskStorage } from './taskStorage';

const STORAGE_KEY = 'kanban_tasks';

type StoredWrite = {
  key: string;
  value: string;
};

type FakeStorage = TaskStorage & {
  reads: string[];
  writes: StoredWrite[];
};

function createTask(fields: {
  id: number;
  type: Task['type'];
  startDay?: number;
  endDay?: number;
  text?: string;
}): Task {
  return {
    startDay: 10,
    endDay: 20,
    text: 'Task',
    ...fields,
  };
}

function createFakeStorage(options?: {
  initial?: string | null;
  failGet?: boolean;
  failSet?: boolean;
}): FakeStorage {
  const reads: string[] = [];
  const writes: StoredWrite[] = [];
  const initial = options?.initial ?? null;

  return {
    reads,
    writes,
    getItem(key) {
      reads.push(key);

      if (options?.failGet) {
        throw new Error('getItem failed');
      }

      if (key !== STORAGE_KEY) {
        return null;
      }

      return initial;
    },
    setItem(key, value) {
      writes.push({ key, value });

      if (options?.failSet) {
        throw new Error('setItem failed');
      }
    },
  };
}

function expectSeedCopy(actual: Task[], seed: readonly Task[]): void {
  expect(actual).toEqual(seed);
  expect(actual).not.toBe(seed);
  expect(actual[0]).not.toBe(seed[0]);
}

function expectRejectedLoad(raw: string): void {
  const seed = [createTask({ id: 7, type: 'done', text: 'Seed' })];
  const storage = createFakeStorage({ initial: raw });

  const loaded = loadStoredTasks(storage, seed);

  expectSeedCopy(loaded, seed);
  expect(storage.writes).toEqual([]);
  expect(seed[0]?.text).toBe('Seed');
}

describe('loadStoredTasks', () => {
  it('uses the kanban_tasks storage key', () => {
    expect(TASKS_STORAGE_KEY).toBe(STORAGE_KEY);
  });

  it('returns a copy of the seed when storage is null', () => {
    const seed = [createTask({ id: 1, type: 'todo', text: 'Seed' })];

    const loaded = loadStoredTasks(null, seed);

    expectSeedCopy(loaded, seed);
    loaded[0]!.text = 'Changed copy';
    expect(seed[0]?.text).toBe('Seed');
  });

  it('returns a copy of the seed when getItem throws and does not write', () => {
    const seed = [createTask({ id: 1, type: 'in_progress', text: 'Seed' })];
    const storage = createFakeStorage({ failGet: true, initial: '[]' });

    const loaded = loadStoredTasks(storage, seed);

    expectSeedCopy(loaded, seed);
    expect(storage.writes).toEqual([]);
  });

  it('returns a copy of the seed when the key is missing and does not write', () => {
    const seed = [createTask({ id: 1, type: 'review', text: 'Seed' })];
    const storage = createFakeStorage({ initial: null });

    const loaded = loadStoredTasks(storage, seed);

    expect(storage.reads).toEqual([STORAGE_KEY]);
    expectSeedCopy(loaded, seed);
    expect(storage.writes).toEqual([]);
  });

  it('restores a valid list as new task objects and drops extra fields', () => {
    const seed = [createTask({ id: 9, type: 'done', text: 'Seed' })];
    const storage = createFakeStorage({
      initial: JSON.stringify([
        { id: 2, type: 'review', startDay: 5, endDay: 9, text: 'Second', owner: 'extra' },
        { id: 1, type: 'todo', startDay: 1, endDay: 2, text: 'First', extra: true },
      ]),
    });

    const loaded = loadStoredTasks(storage, seed);

    expect(loaded).toEqual([
      { id: 2, type: 'review', startDay: 5, endDay: 9, text: 'Second' },
      { id: 1, type: 'todo', startDay: 1, endDay: 2, text: 'First' },
    ]);
    expect(Object.keys(loaded[0] ?? {}).sort()).toEqual(['endDay', 'id', 'startDay', 'text', 'type']);
    expect(Object.keys(loaded[1] ?? {}).sort()).toEqual(['endDay', 'id', 'startDay', 'text', 'type']);
    expect(storage.writes).toEqual([]);
    expect(seed[0]?.text).toBe('Seed');
  });

  it('restores an empty list instead of replacing it with the seed', () => {
    const seed = [createTask({ id: 1, type: 'todo', text: 'Seed' })];
    const storage = createFakeStorage({ initial: '[]' });

    const loaded = loadStoredTasks(storage, seed);

    expect(loaded).toEqual([]);
    expect(loaded).not.toBe(seed);
    expect(storage.writes).toEqual([]);
  });

  it('returns a copy of the seed for broken JSON and does not write', () => {
    expectRejectedLoad('[');
  });

  it('returns a copy of the seed when the stored value is not an array and does not write', () => {
    expectRejectedLoad(JSON.stringify({ id: 1, type: 'todo' }));
  });

  it('returns a copy of the seed when an item is missing task fields and does not write', () => {
    expectRejectedLoad(
      JSON.stringify([
        { id: 1, type: 'todo', startDay: 1, endDay: 2, text: 'Valid' },
        {},
      ]),
    );
  });

  it('returns a copy of the seed when a task type is invalid and does not write', () => {
    expectRejectedLoad(
      JSON.stringify([{ id: 1, type: 'archived', startDay: 1, endDay: 2, text: 'Bad type' }]),
    );
  });

  it('returns a copy of the seed when a task number is not finite and does not write', () => {
    expectRejectedLoad(
      JSON.stringify([{ id: 1e309, type: 'todo', startDay: 1, endDay: 2, text: 'Infinite id' }]),
    );
  });

  it('returns a copy of the seed when a task id is repeated and does not write', () => {
    expectRejectedLoad(
      JSON.stringify([
        { id: 1, type: 'todo', startDay: 1, endDay: 2, text: 'First' },
        { id: 1, type: 'done', startDay: 3, endDay: 4, text: 'Second' },
      ]),
    );
  });
});

describe('saveStoredTasks', () => {
  it('writes the task list as JSON under kanban_tasks', () => {
    const storage = createFakeStorage();
    const tasks = [
      createTask({ id: 1, type: 'todo', text: 'First' }),
      createTask({ id: 2, type: 'done', text: 'Second' }),
    ];

    saveStoredTasks(storage, tasks);

    expect(storage.writes).toEqual([{ key: STORAGE_KEY, value: JSON.stringify(tasks) }]);
  });

  it('does not throw when setItem fails', () => {
    const storage = createFakeStorage({ failSet: true });
    const tasks = [createTask({ id: 1, type: 'review', text: 'Keep' })];

    expect(() => saveStoredTasks(storage, tasks)).not.toThrow();
    expect(storage.writes).toEqual([{ key: STORAGE_KEY, value: JSON.stringify(tasks) }]);
  });
});

describe('commitTaskAction', () => {
  it('saves the list after adding a task', () => {
    const storage = createFakeStorage();
    const existing = createTask({ id: 1, type: 'todo', text: 'Existing' });
    const added = createTask({ id: 2, type: 'done', text: 'Added' });
    const tasks = [existing];

    const next = commitTaskAction(tasks, { type: 'ADD_TASK', task: added }, storage);

    expect(next).toEqual([existing, added]);
    expect(next).not.toBe(tasks);
    expect(storage.writes).toEqual([{ key: STORAGE_KEY, value: JSON.stringify(next) }]);
  });

  it('saves each change on top of the list already committed', () => {
    const storage = createFakeStorage();
    const existing = createTask({ id: 1, type: 'todo', text: 'Existing' });
    const added = createTask({ id: 2, type: 'review', text: 'Added' });
    const tasks = [existing];

    const afterAdd = commitTaskAction(tasks, { type: 'ADD_TASK', task: added }, storage);
    const afterMove = commitTaskAction(
      afterAdd,
      { type: 'MOVE_TASK', id: added.id, status: 'done' },
      storage,
    );

    expect(afterMove).toEqual([existing, { ...added, type: 'done' }]);
    expect(storage.writes).toEqual([
      { key: STORAGE_KEY, value: JSON.stringify(afterAdd) },
      { key: STORAGE_KEY, value: JSON.stringify(afterMove) },
    ]);
  });

  it('saves the list after updating a task', () => {
    const storage = createFakeStorage();
    const task = createTask({ id: 1, type: 'todo', text: 'Old' });

    const next = commitTaskAction(
      [task],
      { type: 'UPDATE_TASK', id: task.id, changes: { text: 'New' } },
      storage,
    );

    expect(next).toEqual([{ ...task, text: 'New' }]);
    expect(storage.writes).toEqual([{ key: STORAGE_KEY, value: JSON.stringify(next) }]);
  });

  it('saves the list after deleting a task', () => {
    const storage = createFakeStorage();
    const first = createTask({ id: 1, type: 'todo', text: 'First' });
    const second = createTask({ id: 2, type: 'done', text: 'Second' });

    const next = commitTaskAction(
      [first, second],
      { type: 'DELETE_TASK', id: first.id },
      storage,
    );

    expect(next).toEqual([second]);
    expect(storage.writes).toEqual([{ key: STORAGE_KEY, value: JSON.stringify(next) }]);
  });

  it('saves the list after moving a task', () => {
    const storage = createFakeStorage();
    const task = createTask({ id: 1, type: 'todo', text: 'Move me' });

    const next = commitTaskAction(
      [task],
      { type: 'MOVE_TASK', id: task.id, status: 'in_progress' },
      storage,
    );

    expect(next).toEqual([{ ...task, type: 'in_progress' }]);
    expect(storage.writes).toEqual([{ key: STORAGE_KEY, value: JSON.stringify(next) }]);
  });

  it('does not save when the updated id is unknown', () => {
    const storage = createFakeStorage();
    const tasks = [createTask({ id: 1, type: 'todo', text: 'Stay' })];

    const next = commitTaskAction(
      tasks,
      { type: 'UPDATE_TASK', id: 99, changes: { text: 'Missing' } },
      storage,
    );

    expect(next).toBe(tasks);
    expect(storage.writes).toEqual([]);
  });

  it('does not save when the deleted id is unknown', () => {
    const storage = createFakeStorage();
    const tasks = [createTask({ id: 1, type: 'todo', text: 'Stay' })];

    const next = commitTaskAction(tasks, { type: 'DELETE_TASK', id: 99 }, storage);

    expect(next).toBe(tasks);
    expect(storage.writes).toEqual([]);
  });

  it('does not save when the moved id is unknown', () => {
    const storage = createFakeStorage();
    const tasks = [createTask({ id: 1, type: 'todo', text: 'Stay' })];

    const next = commitTaskAction(tasks, { type: 'MOVE_TASK', id: 99, status: 'done' }, storage);

    expect(next).toBe(tasks);
    expect(storage.writes).toEqual([]);
  });

  it('does not save when the added id already exists', () => {
    const storage = createFakeStorage();
    const tasks = [createTask({ id: 1, type: 'todo', text: 'Stay' })];

    const next = commitTaskAction(
      tasks,
      { type: 'ADD_TASK', task: createTask({ id: 1, type: 'done', text: 'Duplicate' }) },
      storage,
    );

    expect(next).toBe(tasks);
    expect(storage.writes).toEqual([]);
  });

  it('does not save when a task is moved to its current status', () => {
    const storage = createFakeStorage();
    const task = createTask({ id: 1, type: 'review', text: 'Stay' });
    const tasks = [task];

    const next = commitTaskAction(tasks, { type: 'MOVE_TASK', id: task.id, status: 'review' }, storage);

    expect(next).toBe(tasks);
    expect(storage.writes).toEqual([]);
  });

  it('does not save when an update leaves the task unchanged', () => {
    const storage = createFakeStorage();
    const task = createTask({ id: 1, type: 'todo', text: 'Same' });
    const tasks = [task];

    const next = commitTaskAction(
      tasks,
      { type: 'UPDATE_TASK', id: task.id, changes: { text: task.text } },
      storage,
    );

    expect(next).toBe(tasks);
    expect(storage.writes).toEqual([]);
  });

  it('returns the new state without throwing when storage is null', () => {
    const existing = createTask({ id: 1, type: 'todo', text: 'Existing' });
    const added = createTask({ id: 2, type: 'done', text: 'Added' });
    const tasks = [existing];

    const next = commitTaskAction(tasks, { type: 'ADD_TASK', task: added }, null);

    expect(next).toEqual([existing, added]);
    expect(next).not.toBe(tasks);
    expect(next[1]).not.toBe(added);
  });
});
