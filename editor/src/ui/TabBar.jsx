const TABS = [
  { id: "edit", label: "編集" },
  { id: "dates", label: "日程" },
  { id: "publish", label: "公開" },
];

export default function TabBar({ active, onChange }) {
  return (
    <nav className="tabbar" aria-label="編集アプリのタブ">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={"tabbar__item" + (active === tab.id ? " tabbar__item--active" : "")}
          aria-current={active === tab.id ? "page" : undefined}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
