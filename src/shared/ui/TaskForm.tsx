import { useState } from 'react';
import { readTaskDraft, type TaskDraft, type TaskStatus } from '../lib/task';
import { TaskGlyph } from './taskGlyph';
import styles from './TaskForm.module.css';

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

export type TaskFormValues = {
  type: TaskStatus;
  startDay: string;
  endDay: string;
  text: string;
};

type TaskFormProps = {
  initial: TaskFormValues;
  onSubmit: (draft: TaskDraft) => void;
  onCancel: () => void;
};

export function TaskForm({ initial, onSubmit, onCancel }: TaskFormProps) {
  const [type, setType] = useState(initial.type);
  const [startDay, setStartDay] = useState(initial.startDay);
  const [endDay, setEndDay] = useState(initial.endDay);
  const [text, setText] = useState(initial.text);
  const [invalid, setInvalid] = useState(false);

  function submit() {
    const draft = readTaskDraft({ type, startDay, endDay, text });

    if (draft === undefined) {
      setInvalid(true);
      return;
    }

    onSubmit(draft);
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className={styles.row}>
        <span className={styles.label}>Статус:</span>
        <select
          className={styles.field}
          value={type}
          aria-invalid={invalid}
          onChange={(event) => setType(event.target.value as TaskStatus)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.row}>
        <span className={styles.label}>Начало:</span>
        <input
          className={styles.field}
          value={startDay}
          aria-invalid={invalid}
          onChange={(event) => setStartDay(event.target.value)}
        />
      </label>
      <label className={styles.row}>
        <span className={styles.label}>Окончание:</span>
        <input
          className={styles.field}
          value={endDay}
          aria-invalid={invalid}
          onChange={(event) => setEndDay(event.target.value)}
        />
      </label>
      <label className={styles.row}>
        <span className={styles.label}>Описание:</span>
        <input
          className={styles.field}
          value={text}
          aria-invalid={invalid}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      {invalid ? (
        <p className={styles.error}>
          Заполните все поля. Дата в формате дд.мм.гггг, окончание не раньше начала.
        </p>
      ) : null}
      <div className={styles.actions}>
        <button type="button" className={styles.action} aria-label="Отмена" onClick={onCancel}>
          <TaskGlyph name="cancel" className={styles.glyph} />
        </button>
        <button type="submit" className={styles.action} aria-label="Сохранить">
          <TaskGlyph name="confirm" className={styles.glyph} />
        </button>
      </div>
    </form>
  );
}
