import tasksJson from './tasks.json';
import { isTaskStatus, type Task } from '../shared/lib/task';

type TaskRecord = {
  id: number;
  type: string;
  startDay: number;
  endDay: number;
  text: string;
};

function readTasks(source: readonly TaskRecord[]): Task[] {
  return source.map((item) => {
    if (!isTaskStatus(item.type)) {
      throw new Error(`Unknown task status: ${item.type}`);
    }

    return { ...item, type: item.type };
  });
}

export const tasks: Task[] = readTasks(tasksJson);
