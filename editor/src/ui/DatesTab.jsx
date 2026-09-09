import { useState } from "react";
import { nextEventId } from "../lib/schema.js";

const KIND_LABELS = { event: "イベント出店", workshop: "ワークショップ" };

const EMPTY_FORM = { kind: "event", date: "", time: "", title: "", place: "", body: "" };

export default function DatesTab({ events, onChange }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmId, setConfirmId] = useState(null);

  const list = events || [];
  const sorted = [...list].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  function handleAdd(e) {
    e.preventDefault();
    if (!form.date || !form.title.trim()) return;
    const id = nextEventId(list);
    onChange([...list, { id, ...form, title: form.title.trim() }]);
    setForm(EMPTY_FORM);
  }

  function handleDelete(id) {
    onChange(list.filter((e) => e.id !== id));
    setConfirmId(null);
  }

  return (
    <div className="dates-tab">
      <ul className="event-list">
        {sorted.map((e) => (
          <li className="event-list__item" key={e.id}>
            <div className="event-list__info">
              <p className="event-list__meta">
                {e.date} ・ {KIND_LABELS[e.kind] || e.kind}
              </p>
              <p className="event-list__title">{e.title}</p>
              {e.place && <p className="event-list__place">{e.place}</p>}
            </div>
            {confirmId === e.id ? (
              <div className="event-list__confirm">
                <span>削除しますか？</span>
                <button type="button" className="btn btn--small btn--danger" onClick={() => handleDelete(e.id)}>
                  削除する
                </button>
                <button type="button" className="btn btn--small btn--ghost" onClick={() => setConfirmId(null)}>
                  やめる
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn--small btn--ghost" onClick={() => setConfirmId(e.id)}>
                削除
              </button>
            )}
          </li>
        ))}
        {sorted.length === 0 && <p className="muted">登録されている日程はありません。</p>}
      </ul>

      <form className="event-form" onSubmit={handleAdd}>
        <h3>新しい日程を追加</h3>
        <label className="field">
          <span>種別</span>
          <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
            <option value="event">イベント出店</option>
            <option value="workshop">ワークショップ</option>
          </select>
        </label>
        <label className="field">
          <span>日付</span>
          <input type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        </label>
        <label className="field">
          <span>時間（任意）</span>
          <input
            type="text"
            value={form.time}
            onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            placeholder="例: 11:00 – 17:00"
          />
        </label>
        <label className="field">
          <span>タイトル</span>
          <input type="text" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </label>
        <label className="field">
          <span>場所（任意）</span>
          <input type="text" value={form.place} onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))} />
        </label>
        <label className="field">
          <span>説明（任意）</span>
          <textarea rows={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
        </label>
        <button type="submit" className="btn">
          追加する
        </button>
      </form>
    </div>
  );
}
