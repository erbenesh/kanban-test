import { useRef, useState, type DragEvent, type PointerEvent } from 'react';
import { formatTaskDay, isTaskOverdue, type Task, type TaskDraft } from '../lib/task';
import { TaskForm } from './TaskForm';
import { TaskGlyph } from './taskGlyph';
import styles from './TaskCard.module.css';

type TaskCardProps = {
  task: Task;
  currentDate: number;
  onUpdate: (id: number, draft: TaskDraft) => void;
  onDelete: (id: number) => void;
};

function pressStartedOnControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('button, a, input, select, textarea, label, form') !== null
  );
}

export function TaskCard({ task, currentDate, onUpdate, onDelete }: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [dragging, setDragging] = useState(false);
  const suppressDrag = useRef(false);
  const overdue = isTaskOverdue(task, currentDate);

  function rememberPress(event: PointerEvent<HTMLElement>) {
    suppressDrag.current = pressStartedOnControl(event.target);
  }

  function startDrag(event: DragEvent<HTMLElement>) {
    if (suppressDrag.current) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(task.id));
    setDragging(true);
  }

  function endDrag() {
    suppressDrag.current = false;
    setDragging(false);
  }

  if (editing) {
    return (
      <TaskForm
        initial={{
          type: task.type,
          startDay: formatTaskDay(task.startDay),
          endDay: formatTaskDay(task.endDay),
          text: task.text,
        }}
        onSubmit={(draft) => {
          onUpdate(task.id, draft);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <article
      className={[styles.card, overdue ? styles.overdueCard : '', dragging ? styles.dragging : '']
        .filter(Boolean)
        .join(' ')}
      draggable
      onPointerDown={rememberPress}
      onDragStart={startDrag}
      onDragEnd={endDrag}
    >
      <p className={styles.row}>
        <span className={styles.label}>Начало:</span>
        <span className={styles.value}>{formatTaskDay(task.startDay)}</span>
        <span className={styles.actions}>
          {confirmingDelete ? <span className={styles.confirm}>Удалить?</span> : null}
          <button
            type="button"
            className={styles.iconButton}
            aria-label={confirmingDelete ? 'Отменить удаление' : 'Редактировать задачу'}
            onClick={() => {
              if (confirmingDelete) {
                setConfirmingDelete(false);
                return;
              }

              setEditing(true);
            }}
          >
            <TaskGlyph
              name={confirmingDelete ? 'cancel' : 'edit'}
              className={confirmingDelete ? styles.confirmGlyph : styles.glyph}
            />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={confirmingDelete ? 'Подтвердить удаление' : 'Удалить задачу'}
            onClick={() => {
              if (confirmingDelete) {
                onDelete(task.id);
                return;
              }

              setConfirmingDelete(true);
            }}
          >
            <TaskGlyph
              name={confirmingDelete ? 'confirm' : 'trash'}
              className={confirmingDelete ? styles.confirmGlyph : styles.glyph}
            />
          </button>
        </span>
      </p>
      <p className={styles.row}>
        <span className={styles.label}>Окончание:</span>
        <span className={overdue ? `${styles.value} ${styles.overdue}` : styles.value}>
          {formatTaskDay(task.endDay)}
        </span>
      </p>
      <p className={styles.row}>
        <span className={styles.label}>Описание:</span>
        <span className={styles.value}>{task.text}</span>
      </p>
    </article>
  );
}
