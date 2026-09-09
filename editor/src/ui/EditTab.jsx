import { useState } from "react";
import SectionSheet from "./SectionSheet.jsx";

const TYPE_LABELS = {
  hero: "ヒーロー",
  text: "テキスト",
  "image-text": "画像+テキスト",
  "candle-grid": "キャンドル一覧",
  events: "イベント",
  gallery: "ギャラリー",
  "contact-social": "お問い合わせ",
};

export default function EditTab({ home, onChange }) {
  const [editingId, setEditingId] = useState(null);
  const sections = home?.sections || [];

  function updateSections(next) {
    onChange({ ...home, sections: next });
  }

  function toggleVisible(id) {
    updateSections(sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
  }

  function move(id, dir) {
    const idx = sections.findIndex((s) => s.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= sections.length) return;
    const next = sections.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    updateSections(next);
  }

  function handleSectionSave(updated) {
    updateSections(sections.map((s) => (s.id === updated.id ? updated : s)));
  }

  const editingSection = sections.find((s) => s.id === editingId) || null;

  return (
    <div className="edit-tab">
      <ul className="section-list">
        {sections.map((section, i) => (
          <li className="section-list__item" key={section.id}>
            <div className="section-list__info">
              <p className="section-list__id">{section.id}</p>
              <p className="section-list__type">{TYPE_LABELS[section.type] || section.type}</p>
            </div>
            <div className="section-list__actions">
              <button
                type="button"
                className="icon-btn"
                onClick={() => move(section.id, -1)}
                disabled={i === 0}
                aria-label={`${section.id} を上へ移動`}
              >
                ▲
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => move(section.id, 1)}
                disabled={i === sections.length - 1}
                aria-label={`${section.id} を下へ移動`}
              >
                ▼
              </button>
              <label className="switch">
                <input type="checkbox" checked={section.visible} onChange={() => toggleVisible(section.id)} />
                <span>表示</span>
              </label>
              <button type="button" className="btn btn--small" onClick={() => setEditingId(section.id)}>
                編集
              </button>
            </div>
          </li>
        ))}
        {sections.length === 0 && <p className="muted">セクションがありません。</p>}
      </ul>
      {editingSection && (
        <SectionSheet section={editingSection} onSave={handleSectionSave} onClose={() => setEditingId(null)} />
      )}
    </div>
  );
}
