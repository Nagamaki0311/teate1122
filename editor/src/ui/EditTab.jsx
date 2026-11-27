import { useState } from "react";
import SectionSheet from "./SectionSheet.jsx";

import { sectionName } from "../lib/section-names.js";

export default function EditTab({
  original,
  events,
  home,
  site,
  candles,
  pendingImages,
  onChange,
  onSiteChange,
  onCandlesChange,
  onImageStaged,
  onSectionOpen,
}) {
  const [editingId, setEditingId] = useState(null);
  const sections = home?.sections || [];

  function openSection(id) {
    setEditingId(id);
    onSectionOpen?.(id);
  }

  function closeSection() {
    setEditingId(null);
    onSectionOpen?.(null);
  }

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
      <label className="field">
        <span>配色と書体</span>
        <select value={site.theme?.preset || "quiet-mincho"} onChange={(e) => onSiteChange({ ...site, theme: { ...site.theme, preset: e.target.value } })}>
          <option value="quiet-mincho">生成り・はんなり明朝</option>
          <option value="forest">若葉・ゴシック</option>
          <option value="clay">薄紅・本文明朝</option>
        </select>
      </label>
      <ul className="section-list">
        {sections.map((section, i) => {
          const name = sectionName(section);
          const heading = [section.props.heading].flat().join("");
          const ids = [section.props.image?.assetId, ...(section.props.items || []).map(item => item.assetId)];
          if (section.type === "candle-grid") ids.push(...candles.map(c => c.image?.assetId));
          const differs = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
          const changed = differs(section, original.home.sections[i])
            || (section.type === "events" && differs(events, original.events))
            || (section.type === "candle-grid" && differs(candles, original.candles))
            || differs(site.assets.filter(a => ids.includes(a.id)), original.site.assets.filter(a => ids.includes(a.id)));
          return (
          <li className="section-list__item" key={section.id}>
            <div className="section-list__info">
              <p className="section-list__id">{name}</p>
              {heading && heading !== name && <p className="section-list__type">{heading}</p>}
              {changed && <small className="badge">変更あり</small>}
            </div>
            <div className="section-list__actions">
              <button
                type="button"
                className="icon-btn"
                onClick={() => move(section.id, -1)}
                disabled={i === 0}
                aria-label={`${name}を上へ移動`}
              >
                ▲
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => move(section.id, 1)}
                disabled={i === sections.length - 1}
                aria-label={`${name}を下へ移動`}
              >
                ▼
              </button>
              <label className="switch">
                <input type="checkbox" aria-label={`${name}を表示`} checked={section.visible} onChange={() => toggleVisible(section.id)} />
                <span>表示</span>
              </label>
              {section.type === "contact-social" && <label className="switch">
                <input type="checkbox" checked={section.props.showForm === true} onChange={(e) => handleSectionSave({ ...section, props: { ...section.props, showForm: e.target.checked } })} />
                <span>フォームを表示</span>
              </label>}
              <button type="button" className="btn btn--small" aria-label={`${name}を編集`} onClick={() => openSection(section.id)}>
                編集
              </button>
            </div>
          </li>
        );})}
        {sections.length === 0 && <p className="muted">編集する項目がありません。</p>}
      </ul>
      {editingSection && (
        <SectionSheet
          name={sectionName(editingSection)}
          section={editingSection}
          home={home}
          site={site}
          candles={candles}
          pendingImages={pendingImages}
          onSave={handleSectionSave}
          onHomeChange={onChange}
          onSiteChange={onSiteChange}
          onCandlesChange={onCandlesChange}
          onImageStaged={onImageStaged}
          onClose={closeSection}
        />
      )}
    </div>
  );
}
