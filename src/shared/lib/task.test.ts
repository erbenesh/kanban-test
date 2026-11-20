import { describe, expect, it } from 'vitest';
import {
  createTaskId,
  filterTasks,
  formatTaskDay,
  isTaskOverdue,
  readTaskDraft,
  sortTasksByStartDay,
  type Task,
} from './task';

function createTask(fields: {
  id: number;
  type: Task['type'];
  startDay?: number;
  endDay?: number;
  text?: string;
}): Task {
  return {
    startDay: Date.UTC(2024, 5, 1),
    endDay: Date.UTC(2024, 5, 10),
    text: 'Task',
    ...fields,
  };
}

describe('isTaskOverdue', () => {
  const currentDate = Date.UTC(2024, 5, 15, 12, 0, 0);
  const previousUtcDay = Date.UTC(2024, 5, 14, 23, 59, 59, 999);

  it('marks a todo task overdue when its end day is before the current UTC day', () => {
    const task = createTask({ id: 1, type: 'todo', endDay: previousUtcDay });

    expect(isTaskOverdue(task, currentDate)).toBe(true);
  });

  it('marks an in_progress task overdue when its end day is before the current UTC day', () => {
    const task = createTask({ id: 1, type: 'in_progress', endDay: previousUtcDay });

    expect(isTaskOverdue(task, currentDate)).toBe(true);
  });

  it('marks a review task overdue when its end day is before the current UTC day', () => {
    const task = createTask({ id: 1, type: 'review', endDay: previousUtcDay });

    expect(isTaskOverdue(task, currentDate)).toBe(true);
  });

  it('does not mark a done task overdue when its end day is before the current UTC day', () => {
    const task = createTask({ id: 1, type: 'done', endDay: previousUtcDay });

    expect(isTaskOverdue(task, currentDate)).toBe(false);
  });

  it('does not mark a task overdue when the deadline is the same UTC day', () => {
    const task = createTask({
      id: 1,
      type: 'todo',
      endDay: Date.UTC(2024, 5, 15, 1, 0, 0),
    });

    expect(isTaskOverdue(task, Date.UTC(2024, 5, 15, 18, 0, 0))).toBe(false);
  });

  it('does not mark a task overdue when the deadline is a later UTC day', () => {
    const task = createTask({
      id: 1,
      type: 'in_progress',
      endDay: Date.UTC(2024, 5, 16, 0, 0, 0),
    });

    expect(isTaskOverdue(task, Date.UTC(2024, 5, 15, 23, 59, 59, 999))).toBe(false);
  });
});

describe('formatTaskDay', () => {
  it('formats a UTC timestamp as dd.mm.yyyy', () => {
    expect(formatTaskDay(Date.UTC(2025, 0, 19, 18, 40))).toBe('19.01.2025');
  });

  it('keeps the UTC calendar day when the local offset would cross midnight', () => {
    expect(formatTaskDay(Date.UTC(2023, 10, 14, 22, 13, 20))).toBe('14.11.2023');
  });
});

describe('readTaskDraft', () => {
  const valid = {
    type: 'review',
    startDay: '19.01.2025',
    endDay: '30.01.2025',
    text: '  Сделать тестовое  ',
  };

  it('accepts a complete draft and trims the description', () => {
    expect(readTaskDraft(valid)).toEqual({
      type: 'review',
      startDay: Date.UTC(2025, 0, 19),
      endDay: Date.UTC(2025, 0, 30),
      text: 'Сделать тестовое',
    });
  });

  it.each(['todo', 'in_progress', 'review', 'done'] as const)(
    'accepts status %s',
    (type) => {
      expect(readTaskDraft({ ...valid, type })?.type).toBe(type);
    },
  );

  it('rejects an empty description, a bad date, an unknown status and an end before the start', () => {
    expect(readTaskDraft({ ...valid, text: '   ' })).toBeUndefined();
    expect(readTaskDraft({ ...valid, startDay: '31.02.2025' })).toBeUndefined();
    expect(readTaskDraft({ ...valid, endDay: '1.1.2025' })).toBeUndefined();
    expect(readTaskDraft({ ...valid, type: 'blocked' })).toBeUndefined();
    expect(readTaskDraft({ ...valid, startDay: '30.01.2025', endDay: '19.01.2025' })).toBeUndefined();
  });

  it('allows the end day to match the start day', () => {
    expect(readTaskDraft({ ...valid, endDay: '19.01.2025' })?.endDay).toBe(Date.UTC(2025, 0, 19));
  });
});

describe('createTaskId', () => {
  it('starts at 1 for an empty board', () => {
    expect(createTaskId([])).toBe(1);
  });

  it('returns one more than the largest id', () => {
    expect(createTaskId([{ id: 4 }, { id: 18 }, { id: 2 }])).toBe(19);
  });
});

describe('sortTasksByStartDay', () => {
  it('sorts tasks by startDay in ascending order', () => {
    const early = createTask({ id: 1, type: 'todo', startDay: Date.UTC(2024, 0, 2) });
    const middle = createTask({
      id: 2,
      type: 'in_progress',
      startDay: Date.UTC(2024, 3, 10, 15, 45),
    });
    const late = createTask({ id: 3, type: 'review', startDay: Date.UTC(2024, 8, 1) });

    expect(sortTasksByStartDay([late, early, middle])).toEqual([early, middle, late]);
  });

  it('keeps the original array unchanged after sorting', () => {
    const late = createTask({ id: 1, type: 'todo', startDay: Date.UTC(2024, 8, 1) });
    const early = createTask({ id: 2, type: 'todo', startDay: Date.UTC(2024, 0, 2) });
    const tasks = [late, early];

    sortTasksByStartDay(tasks);

    expect(tasks).toEqual([late, early]);
  });

  it('returns an empty array when there are no tasks to sort', () => {
    expect(sortTasksByStartDay([])).toEqual([]);
  });
});

describe('filterTasks', () => {
  it('returns tasks whose text contains the query', () => {
    const match = createTask({ id: 1, type: 'todo', text: 'Prepare the board notes' });
    const other = createTask({ id: 2, type: 'in_progress', text: 'Send the invoice' });

    expect(filterTasks([other, match], 'board')).toEqual([match]);
  });

  it('matches task text regardless of case and ignores surrounding spaces', () => {
    const match = createTask({ id: 1, type: 'todo', text: 'Write Report' });
    const other = createTask({ id: 2, type: 'review', text: 'Other work' });

    expect(filterTasks([match, other], '  rEpOrT  ')).toEqual([match]);
  });

  it('returns tasks whose startDay falls on the queried UTC day', () => {
    const onStartDay = createTask({
      id: 1,
      type: 'todo',
      startDay: Date.UTC(2024, 0, 5, 18, 30),
      endDay: Date.UTC(2024, 0, 20),
      text: 'Plan',
    });
    const mentionedOnly = createTask({
      id: 2,
      type: 'in_progress',
      startDay: Date.UTC(2024, 0, 6),
      endDay: Date.UTC(2024, 0, 7),
      text: 'Note 05.01.2024',
    });

    expect(filterTasks([mentionedOnly, onStartDay], '05.01.2024')).toEqual([onStartDay]);
  });

  it('returns tasks whose endDay falls on the queried UTC day', () => {
    const onEndDay = createTask({
      id: 1,
      type: 'review',
      startDay: Date.UTC(2024, 11, 1),
      endDay: Date.UTC(2024, 11, 31, 8, 15),
      text: 'Release',
    });
    const mentionedOnly = createTask({
      id: 2,
      type: 'todo',
      startDay: Date.UTC(2024, 11, 30),
      endDay: Date.UTC(2025, 0, 2),
      text: 'Deadline 31.12.2024',
    });

    expect(filterTasks([mentionedOnly, onEndDay], '31.12.2024')).toEqual([onEndDay]);
  });

  it('searches an incomplete date as text and does not throw', () => {
    const mentioned = createTask({ id: 1, type: 'todo', text: 'Follow up 1.1.2024' });
    const onThatCalendarDay = createTask({
      id: 2,
      type: 'in_progress',
      startDay: Date.UTC(2024, 0, 1, 12),
      endDay: Date.UTC(2024, 0, 1, 18),
      text: 'New year',
    });

    expect(() => filterTasks([onThatCalendarDay, mentioned], '1.1.2024')).not.toThrow();
    expect(filterTasks([onThatCalendarDay, mentioned], '1.1.2024')).toEqual([mentioned]);
  });

  it('searches an invalid calendar date as text and does not throw', () => {
    const mentioned = createTask({ id: 1, type: 'todo', text: 'Broken 32.13.2024 note' });
    const other = createTask({ id: 2, type: 'done', text: 'Regular task' });

    expect(() => filterTasks([other, mentioned], '32.13.2024')).not.toThrow();
    expect(filterTasks([other, mentioned], '32.13.2024')).toEqual([mentioned]);
  });

  it('returns every task for an empty query', () => {
    const tasks = [
      createTask({ id: 1, type: 'todo', text: 'First' }),
      createTask({ id: 2, type: 'done', text: 'Second' }),
    ];

    expect(filterTasks(tasks, '')).toEqual(tasks);
  });

  it('returns every task for a query made of spaces', () => {
    const tasks = [
      createTask({ id: 1, type: 'todo', text: 'First' }),
      createTask({ id: 2, type: 'done', text: 'Second' }),
    ];

    expect(filterTasks(tasks, '   ')).toEqual(tasks);
  });

  it('returns an empty array when there are no tasks to filter', () => {
    expect(filterTasks([], 'board')).toEqual([]);
  });

  it('returns an empty array and leaves the source unchanged when nothing matches', () => {
    const first = createTask({ id: 1, type: 'todo', text: 'Board notes' });
    const second = createTask({ id: 2, type: 'done', text: 'Invoice' });
    const tasks = [first, second];

    expect(filterTasks(tasks, 'missing')).toEqual([]);
    expect(tasks).toEqual([first, second]);
  });

  it('returns every task again when the query is cleared', () => {
    const first = createTask({ id: 1, type: 'todo', text: 'Board notes' });
    const second = createTask({ id: 2, type: 'done', text: 'Invoice' });
    const tasks = [first, second];

    expect(filterTasks(tasks, 'board')).toEqual([first]);
    expect(filterTasks(tasks, '')).toEqual([first, second]);
  });

  it('keeps start-day order when the filtered tasks are sorted', () => {
    const early = createTask({
      id: 1,
      type: 'todo',
      startDay: Date.UTC(2024, 0, 2),
      text: 'Alpha notes',
    });
    const middle = createTask({
      id: 2,
      type: 'review',
      startDay: Date.UTC(2024, 3, 10),
      text: 'Beta notes',
    });
    const late = createTask({
      id: 3,
      type: 'done',
      startDay: Date.UTC(2024, 8, 1),
      text: 'Gamma notes',
    });
    const hidden = createTask({
      id: 4,
      type: 'in_progress',
      startDay: Date.UTC(2024, 2, 1),
      text: 'Invoice',
    });

    expect(sortTasksByStartDay(filterTasks([late, hidden, early, middle], 'notes'))).toEqual([
      early,
      middle,
      late,
    ]);
  });
});
