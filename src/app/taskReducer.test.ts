import { describe, expect, it } from 'vitest';
import type { Task } from '../shared/lib/task';
import { taskReducer } from './taskReducer';

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

function createBoard(): [Task, Task, Task] {
  return [
    createTask({ id: 1, type: 'todo', text: 'First' }),
    createTask({ id: 2, type: 'in_progress', text: 'Middle' }),
    createTask({ id: 3, type: 'review', text: 'Last' }),
  ];
}

function cloneTasks(tasks: readonly Task[]): Task[] {
  return tasks.map((task) => ({ ...task }));
}

describe('taskReducer ADD_TASK', () => {
  it('appends a copy of a new task without changing the original array', () => {
    const [first, middle, last] = createBoard();
    const tasks = [first, middle, last];
    const snapshot = cloneTasks(tasks);
    const added = createTask({ id: 4, type: 'done', text: 'Added' });

    const next = taskReducer(tasks, { type: 'ADD_TASK', task: added });

    expect(next).toEqual([first, middle, last, added]);
    expect(next).not.toBe(tasks);
    expect(next[0]).toBe(first);
    expect(next[1]).toBe(middle);
    expect(next[2]).toBe(last);
    expect(next[3]).not.toBe(added);
    added.text = 'Changed after add';
    expect(next[3]).toEqual(createTask({ id: 4, type: 'done', text: 'Added' }));
    expect(tasks).toEqual(snapshot);
  });

  it('appends a task to an empty list', () => {
    const tasks: Task[] = [];
    const added = createTask({ id: 1, type: 'todo', text: 'Only' });

    const next = taskReducer(tasks, { type: 'ADD_TASK', task: added });

    expect(next).toEqual([added]);
    expect(next).not.toBe(tasks);
    expect(next[0]).not.toBe(added);
    expect(tasks).toEqual([]);
  });

  it('returns the same array when the task id already exists', () => {
    const [first, middle, last] = createBoard();
    const tasks = [first, middle, last];
    const snapshot = cloneTasks(tasks);
    const duplicate = createTask({ id: 2, type: 'done', text: 'Duplicate' });

    const next = taskReducer(tasks, { type: 'ADD_TASK', task: duplicate });

    expect(next).toBe(tasks);
    expect(tasks).toEqual(snapshot);
    expect(duplicate.text).toBe('Duplicate');
  });
});

describe('taskReducer UPDATE_TASK', () => {
  it('keeps omitted fields and the same id when other fields change', () => {
    const [first, middle, last] = createBoard();
    const tasks = [first, middle, last];
    const snapshot = cloneTasks(tasks);

    const next = taskReducer(tasks, {
      type: 'UPDATE_TASK',
      id: middle.id,
      changes: { text: 'Updated', startDay: 11 },
    });

    expect(next).toEqual([
      first,
      { id: middle.id, type: middle.type, startDay: 11, endDay: middle.endDay, text: 'Updated' },
      last,
    ]);
    expect(next).not.toBe(tasks);
    expect(next[0]).toBe(first);
    expect(next[1]).not.toBe(middle);
    expect(next[2]).toBe(last);
    expect(tasks).toEqual(snapshot);
  });

  it('updates the first task and leaves the later tasks in place', () => {
    const [first, middle, last] = createBoard();
    const tasks = [first, middle, last];

    const next = taskReducer(tasks, {
      type: 'UPDATE_TASK',
      id: first.id,
      changes: { endDay: 30 },
    });

    expect(next.map((task) => task.id)).toEqual([first.id, middle.id, last.id]);
    expect(next[0]).toEqual({ ...first, endDay: 30 });
    expect(next[0]).not.toBe(first);
    expect(next[1]).toBe(middle);
    expect(next[2]).toBe(last);
    expect(first.endDay).toBe(20);
  });

  it('updates the last task and leaves the earlier tasks in place', () => {
    const [first, middle, last] = createBoard();
    const tasks = [first, middle, last];

    const next = taskReducer(tasks, {
      type: 'UPDATE_TASK',
      id: last.id,
      changes: { type: 'done' },
    });

    expect(next.map((task) => task.id)).toEqual([first.id, middle.id, last.id]);
    expect(next[2]).toEqual({ ...last, type: 'done' });
    expect(next[2]).not.toBe(last);
    expect(next[0]).toBe(first);
    expect(next[1]).toBe(middle);
    expect(last.type).toBe('review');
  });

  it('stores only the task fields on the updated task', () => {
    const task = {
      ...createTask({ id: 1, type: 'todo', text: 'Dirty' }),
      note: 'drop me',
    };
    const tasks = [task];

    const next = taskReducer(tasks, {
      type: 'UPDATE_TASK',
      id: task.id,
      changes: { text: 'Clean' },
    });

    expect(next[0]).toEqual(createTask({ id: 1, type: 'todo', text: 'Clean' }));
    expect(Object.keys(next[0] ?? {}).sort()).toEqual(['endDay', 'id', 'startDay', 'text', 'type']);
    expect(task.note).toBe('drop me');
  });

  it('returns the same array when the id is unknown', () => {
    const tasks = createBoard();
    const snapshot = cloneTasks(tasks);

    const next = taskReducer(tasks, {
      type: 'UPDATE_TASK',
      id: 99,
      changes: { text: 'Missing' },
    });

    expect(next).toBe(tasks);
    expect(tasks).toEqual(snapshot);
  });

  it('returns the same array when the changes match the current task', () => {
    const [first, middle, last] = createBoard();
    const tasks = [first, middle, last];

    const next = taskReducer(tasks, {
      type: 'UPDATE_TASK',
      id: middle.id,
      changes: { text: middle.text, type: middle.type },
    });

    expect(next).toBe(tasks);
    expect(middle.text).toBe('Middle');
  });

  it('returns the same array when the list is empty', () => {
    const tasks: Task[] = [];

    const next = taskReducer(tasks, {
      type: 'UPDATE_TASK',
      id: 1,
      changes: { text: 'Nobody' },
    });

    expect(next).toBe(tasks);
  });
});

describe('taskReducer DELETE_TASK', () => {
  it('removes a task and keeps the order of the remaining tasks', () => {
    const [first, middle, last] = createBoard();
    const tasks = [first, middle, last];
    const snapshot = cloneTasks(tasks);

    const next = taskReducer(tasks, { type: 'DELETE_TASK', id: middle.id });

    expect(next).toEqual([first, last]);
    expect(next).not.toBe(tasks);
    expect(next[0]).toBe(first);
    expect(next[1]).toBe(last);
    expect(tasks).toEqual(snapshot);
  });

  it('removes the first task and keeps the later tasks in order', () => {
    const [first, middle, last] = createBoard();
    const tasks = [first, middle, last];

    const next = taskReducer(tasks, { type: 'DELETE_TASK', id: first.id });

    expect(next).toEqual([middle, last]);
    expect(next[0]).toBe(middle);
    expect(next[1]).toBe(last);
    expect(first.text).toBe('First');
  });

  it('removes the last task and keeps the earlier tasks in order', () => {
    const [first, middle, last] = createBoard();
    const tasks = [first, middle, last];

    const next = taskReducer(tasks, { type: 'DELETE_TASK', id: last.id });

    expect(next).toEqual([first, middle]);
    expect(next[0]).toBe(first);
    expect(next[1]).toBe(middle);
    expect(last.text).toBe('Last');
  });

  it('returns the same array when the id is unknown', () => {
    const tasks = createBoard();
    const snapshot = cloneTasks(tasks);

    const next = taskReducer(tasks, { type: 'DELETE_TASK', id: 99 });

    expect(next).toBe(tasks);
    expect(tasks).toEqual(snapshot);
  });

  it('returns the same array when the list is empty', () => {
    const tasks: Task[] = [];

    const next = taskReducer(tasks, { type: 'DELETE_TASK', id: 1 });

    expect(next).toBe(tasks);
  });

  it('returns an empty array when the only task is removed', () => {
    const only = createTask({ id: 1, type: 'in_progress', text: 'Only' });
    const tasks = [only];

    const next = taskReducer(tasks, { type: 'DELETE_TASK', id: only.id });

    expect(next).toEqual([]);
    expect(next).not.toBe(tasks);
    expect(tasks).toEqual([only]);
  });
});

describe('taskReducer MOVE_TASK', () => {
  it('changes the status of one task and keeps its index and other fields', () => {
    const [first, middle, last] = createBoard();
    const tasks = [first, middle, last];
    const snapshot = cloneTasks(tasks);

    const next = taskReducer(tasks, { type: 'MOVE_TASK', id: middle.id, status: 'review' });

    expect(next).toEqual([first, { ...middle, type: 'review' }, last]);
    expect(next).not.toBe(tasks);
    expect(next.map((task) => task.id)).toEqual([first.id, middle.id, last.id]);
    expect(next[1]).not.toBe(middle);
    expect(next[0]).toBe(first);
    expect(next[2]).toBe(last);
    expect(tasks).toEqual(snapshot);
  });

  it('moves the first task without shifting the other tasks', () => {
    const [first, middle, last] = createBoard();
    const tasks = [first, middle, last];

    const next = taskReducer(tasks, { type: 'MOVE_TASK', id: first.id, status: 'done' });

    expect(next.map((task) => task.id)).toEqual([first.id, middle.id, last.id]);
    expect(next[0]).toEqual({ ...first, type: 'done' });
    expect(next[0]).not.toBe(first);
    expect(next[1]).toBe(middle);
    expect(next[2]).toBe(last);
    expect(first.type).toBe('todo');
  });

  it('moves the last task without shifting the other tasks', () => {
    const [first, middle, last] = createBoard();
    const tasks = [first, middle, last];

    const next = taskReducer(tasks, { type: 'MOVE_TASK', id: last.id, status: 'todo' });

    expect(next.map((task) => task.id)).toEqual([first.id, middle.id, last.id]);
    expect(next[2]).toEqual({ ...last, type: 'todo' });
    expect(next[2]).not.toBe(last);
    expect(next[0]).toBe(first);
    expect(next[1]).toBe(middle);
    expect(last.type).toBe('review');
  });

  it('moves a task into a status that currently has no tasks', () => {
    const [first, middle, last] = createBoard();
    const tasks = [first, middle, last];

    const next = taskReducer(tasks, { type: 'MOVE_TASK', id: middle.id, status: 'done' });

    expect(next).toEqual([first, { ...middle, type: 'done' }, last]);
    expect(next[1]).not.toBe(middle);
    expect(tasks.every((task) => task.type !== 'done')).toBe(true);
  });

  it('returns the same array when the task already has that status', () => {
    const [first, middle, last] = createBoard();
    const tasks = [first, middle, last];
    const snapshot = cloneTasks(tasks);

    const next = taskReducer(tasks, { type: 'MOVE_TASK', id: middle.id, status: middle.type });

    expect(next).toBe(tasks);
    expect(tasks).toEqual(snapshot);
  });

  it('returns the same array when the id is unknown', () => {
    const tasks = createBoard();
    const snapshot = cloneTasks(tasks);

    const next = taskReducer(tasks, { type: 'MOVE_TASK', id: 99, status: 'done' });

    expect(next).toBe(tasks);
    expect(tasks).toEqual(snapshot);
  });

  it('returns the same array when the list is empty', () => {
    const tasks: Task[] = [];

    const next = taskReducer(tasks, { type: 'MOVE_TASK', id: 1, status: 'done' });

    expect(next).toBe(tasks);
  });
});
