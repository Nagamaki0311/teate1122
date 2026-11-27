const TYPE_LABELS = {
  hero: "トップ",
  text: "文章",
  "image-text": "写真と文章",
  "candle-grid": "キャンドル一覧",
  events: "イベント",
  gallery: "ギャラリー",
  "contact-social": "お問い合わせ",
};

const SECTION_NAMES = {
  hero: "トップ", philosophy: "ものづくり", profile: "プロフィール", candles: "キャンドル",
  events: "出店予定", gallery: "出店の記録", contact: "お問い合わせ",
};

export function sectionName(section) {
  return SECTION_NAMES[section.id] || TYPE_LABELS[section.type] || "編集する項目";
}
