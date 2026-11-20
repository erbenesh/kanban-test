import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { tasks } from '../data/tasks';
import { formatTaskDay, isTaskOverdue, sortTasksByStartDay, type TaskStatus } from '../shared/lib/task';
import styles from '../shared/ui/TaskCard.module.css';
import { App } from './App';
import { TaskProvider } from './TaskContext';

const COLUMN_TITLES = ['To Do', 'In Progress', 'Review', 'Done'] as const;

function renderBoard(): string {
  return renderToStaticMarkup(
    <TaskProvider>
      <App />
    </TaskProvider>,
  );
}

function columnMarkup(markup: string, status: TaskStatus): string {
  const marker = `data-column="${status}"`;
  const start = markup.indexOf(marker);
  const next = markup.indexOf('data-column=', start + marker.length);

  return markup.slice(start, next === -1 ? undefined : next);
}

describe('App', () => {
  it('renders the board title and four columns', () => {
    const markup = renderBoard();

    expect(markup).toContain('Your tasks');
    expect(markup.indexOf('To Do')).toBeLessThan(markup.indexOf('In Progress'));
    expect(markup.indexOf('In Progress')).toBeLessThan(markup.indexOf('Review'));
    expect(markup.indexOf('Review')).toBeLessThan(markup.indexOf('Done'));

    for (const title of COLUMN_TITLES) {
      expect(markup).toContain(title);
    }
  });

  it('places each task in the column of its status and sorts that column by start day', () => {
    const markup = renderBoard();
    const statuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

    for (const status of statuses) {
      const column = columnMarkup(markup, status);
      const ordered = sortTasksByStartDay(tasks.filter((task) => task.type === status));
      let previousIndex = -1;

      for (const task of ordered) {
        const index = column.indexOf(task.text);
        expect(index).toBeGreaterThan(previousIndex);
        previousIndex = index;
        expect(column).toContain(formatTaskDay(task.startDay));
        expect(column).toContain(formatTaskDay(task.endDay));
      }

      for (const task of tasks) {
        if (task.type !== status) {
          expect(column).not.toContain(task.text);
        }
      }
    }
  });

  it('marks the end date of an overdue task and leaves done tasks unmarked', () => {
    const markup = renderBoard();
    const currentDate = Date.now();
    const overdue = tasks.find((task) => isTaskOverdue(task, currentDate));
    const finished = tasks.find((task) => task.type === 'done' && task.endDay < currentDate);

    expect(overdue).toBeDefined();
    expect(finished).toBeDefined();

    if (overdue === undefined || finished === undefined) {
      return;
    }

    const overdueColumn = columnMarkup(markup, overdue.type);
    const doneColumn = columnMarkup(markup, 'done');
    const overdueDate = formatTaskDay(overdue.endDay);
    const finishedDate = formatTaskDay(finished.endDay);

    expect(overdueColumn).toContain(styles.overdue);
    expect(overdueColumn).toContain(overdueDate);
    expect(doneColumn).not.toContain(styles.overdue);
    expect(doneColumn).toContain(finishedDate);
  });

  it('marks each task card as a drag source', () => {
    const markup = renderBoard();
    const cards = markup.match(/<article[^>]*\sdraggable="true"/g);

    expect(cards).toHaveLength(tasks.length);
  });

  it('shows the search field and every task while the query is empty', () => {
    const markup = renderBoard();
    const statuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

    expect(markup).toContain('placeholder="поиск..."');
    expect(markup).toContain('aria-label="Поиск задач"');

    for (const status of statuses) {
      expect(markup).toContain(`data-column="${status}"`);
    }

    for (const title of COLUMN_TITLES) {
      expect(markup).toContain(title);
    }

    for (const task of tasks) {
      expect(markup).toContain(task.text);
    }
  });
});
