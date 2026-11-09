import { useState, useRef, useEffect } from 'react';
import FloatingWindow from './ui/FloatingWindow';
import { useNoteStore, countActiveNotes } from '../store/noteStore';
import { useTaskStore } from '../store/taskStore';
import type { QuickNote } from '../store/noteStore';

interface QuickNotesProps {
  onClose: () => void;
}

/** 相对时间：今天 14:20 / 10月26日 */
function timeLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  if (sameDay) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function QuickNotes({ onClose }: QuickNotesProps) {
  const notes = useNoteStore((s) => s.notes);
  const addNote = useNoteStore((s) => s.addNote);
  const updateNote = useNoteStore((s) => s.updateNote);
  const removeNote = useNoteStore((s) => s.removeNote);
  const toggleDone = useNoteStore((s) => s.toggleDone);
  const consumeNote = useNoteStore((s) => s.consumeNote);
  const clearDone = useNoteStore((s) => s.clearDone);
  const addTask = useTaskStore((s) => s.addTask);

  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [toast, setToast] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const submit = () => {
    if (!draft.trim()) return;
    addNote(draft);
    setDraft('');
    inputRef.current?.focus();
  };

  /** 转成任务：速记里的东西多是「不重要不紧急」，默认放尽量减少，之后可以拖到别的象限 */
  const toTask = (note: QuickNote) => {
    addTask(note.text, 'low', 'low');
    consumeNote(note.id);
    setToast('已转到四象限「尽量减少」');
  };

  const active = notes.filter((n) => !n.done);
  const finished = notes.filter((n) => n.done);

  const renderItem = (note: QuickNote) => {
    const isEditing = editingId === note.id;

    const commitEdit = () => {
      updateNote(note.id, editDraft);
      setEditingId(null);
    };

    return (
      <li
        key={note.id}
        className={`group flex items-start gap-2 px-2.5 py-2.5 rounded-[10px] surface-card shadow-warm transition-all duration-200 ${
          note.done ? 'opacity-45' : ''
        }`}
      >
        <button
          onClick={() => toggleDone(note.id)}
          className={`mt-[0.15rem] shrink-0 w-[0.8rem] h-[0.8rem] rounded-[4px] border-[1.5px] flex items-center justify-center transition-all duration-200 active:scale-90 ${
            note.done ? 'bg-amber-400 border-amber-400' : 'border-amber-300 hover:border-amber-500'
          }`}
          title={note.done ? '标记为未处理' : '标记为已处理'}
        >
          {note.done && (
            <svg className="w-[0.5rem] h-[0.5rem] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {isEditing ? (
          <input
            ref={editRef}
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') setEditingId(null);
            }}
            className="flex-1 min-w-0 fs-sm bg-transparent border-b border-amber-300 outline-none text-amber-900 py-0.5"
          />
        ) : (
          <div className="flex-1 min-w-0">
            <p
              className={`fs-sm leading-snug break-words cursor-text ${
                note.done ? 'line-through text-amber-400' : 'text-amber-900'
              }`}
              onDoubleClick={() => {
                setEditingId(note.id);
                setEditDraft(note.text);
              }}
              title="双击修改"
            >
              {note.text}
            </p>
            <span className="fs-2xs text-amber-400/80 tabular-nums">{timeLabel(note.createdAt)}</span>
          </div>
        )}

        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {!note.done && (
            <button
              onClick={() => toTask(note)}
              className="icon-btn w-[1.05rem] h-[1.05rem] hover:text-violet-600 hover:bg-violet-50/70"
              title="转成任务"
            >
              <svg className="w-[0.72rem] h-[0.72rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </button>
          )}
          <button
            onClick={() => removeNote(note.id)}
            className="icon-btn w-[1.05rem] h-[1.05rem] hover:text-pink-600 hover:bg-pink-50/70"
            title="删除"
          >
            <svg className="w-[0.72rem] h-[0.72rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </li>
    );
  };

  return (
    <FloatingWindow
      onClose={onClose}
      width={740}
      storageKey="hudiequan-notes-pos"
      title="灵感"
      subtitle={`${countActiveNotes(notes)} 条待处理 · 可以拖到一边，对着任务列表慢慢处理`}
      iconBg="linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)"
      icon={
        <svg className="w-[1.15rem] h-[1.15rem] text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.7 4.6 4.6 1.7-4.6 1.7L12 15.6l-1.7-4.6L5.7 9.3l4.6-1.7L12 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
        </svg>
      }
      footer={
        finished.length > 0 ? (
          <button onClick={clearDone} className="action-chip fs-xs">
            清掉 {finished.length} 条已处理
          </button>
        ) : undefined
      }
    >
      <div className="space-y-3 min-h-[19rem]">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="买洗衣液、报销 8 月发票、周五交周报…"
            className="flex-1 fs-sm px-3.5 py-2.5 rounded-[10px] bg-white/80 border border-amber-200/70 outline-none focus:border-amber-400 text-amber-900 placeholder:text-amber-300"
          />
          <button
            onClick={submit}
            disabled={!draft.trim()}
            className="shrink-0 px-4 py-2.5 rounded-[10px] fs-sm font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)' }}
          >
            记下
          </button>
        </div>

        {active.length === 0 && finished.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <svg className="w-10 h-10 text-amber-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.7 4.6 4.6 1.7-4.6 1.7L12 15.6l-1.7-4.6L5.7 9.3l4.6-1.7L12 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
            </svg>
            <p className="fs-xs text-amber-500">灵光一现的东西，先扔这里</p>
            <p className="fs-2xs text-amber-300">不用填象限、不用挑日期，回车就存下</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <ul className="grid grid-cols-2 gap-2 items-start">{active.map(renderItem)}</ul>
            )}

            {finished.length > 0 && (
              <div className="pt-1">
                <p className="fs-2xs text-amber-400 px-1 mb-1.5">已处理 {finished.length}</p>
                <ul className="grid grid-cols-2 gap-2 items-start">{finished.map(renderItem)}</ul>
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full bg-violet-900/85 text-white fs-xs anim-pop-in">
          {toast}
        </div>
      )}
    </FloatingWindow>
  );
}
