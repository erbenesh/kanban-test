import { createContext, useContext, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { tasks as initialTasks } from '../data/tasks';
import type { Task, TaskStatus } from '../shared/lib/task';
import { taskReducer, type TaskAction, type TaskChanges } from './taskReducer';
import { loadStoredTasks, saveStoredTasks, type TaskStorage } from './taskStorage';

export type TaskContextValue = {
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: number, changes: TaskChanges) => void;
  deleteTask: (id: number) => void;
  moveTask: (id: number, status: TaskStatus) => void;
};

export const TaskContext = createContext<TaskContextValue | null>(null);

function readBrowserStorage(): TaskStorage | null {
  try {
    const storage = window.localStorage;

    return {
      getItem(key) {
        return storage.getItem(key);
      },
      setItem(key, value) {
        storage.setItem(key, value);
      },
    };
  } catch {
    return null;
  }
}

export function commitTaskAction(
  tasks: readonly Task[],
  action: TaskAction,
  storage: TaskStorage | null,
): Task[] {
  const next = taskReducer(tasks, action);

  if (next !== tasks && storage !== null) {
    saveStoredTasks(storage, next);
  }

  return next;
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, dispatch] = useReducer(taskReducer, initialTasks, (seed) =>
    loadStoredTasks(readBrowserStorage(), seed),
  );
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const value = useMemo<TaskContextValue>(() => {
    const apply = (action: TaskAction) => {
      const current = tasksRef.current;
      const next = commitTaskAction(current, action, readBrowserStorage());

      if (next === current) {
        return;
      }

      tasksRef.current = next;
      dispatch(action);
    };

    return {
      tasks,
      addTask(task) {
        apply({ type: 'ADD_TASK', task });
      },
      updateTask(id, changes) {
        apply({ type: 'UPDATE_TASK', id, changes });
      },
      deleteTask(id) {
        apply({ type: 'DELETE_TASK', id });
      },
      moveTask(id, status) {
        apply({ type: 'MOVE_TASK', id, status });
      },
    };
  }, [tasks]);

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks(): TaskContextValue {
  const value = useContext(TaskContext);

  if (value === null) {
    throw new Error('useTasks must be used within TaskProvider');
  }

  return value;
}
