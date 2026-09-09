// A simplified live re-creation of the top-of-page area — not the real
// site's iframe (see docs/decisions.md D-023: an iframe of the live site
// would show the published content, not the draft). Reflects visible
// sections, their order, headings and body/paragraph text only.
export default function Preview({ home }) {
  const sections = (home?.sections || []).filter((s) => s.visible);

  return (
    <div className="preview">
      {sections.length === 0 && <p className="preview__empty">表示されるセクションがありません。</p>}
      {sections.map((section) => (
        <section key={section.id} className="preview__section" data-type={section.type}>
          {section.props?.kicker && <p className="preview__kicker">{section.props.kicker}</p>}
          <h2 className="preview__heading">
            {Array.isArray(section.props?.heading)
              ? section.props.heading.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < section.props.heading.length - 1 && <br />}
                  </span>
                ))
              : section.props?.heading}
          </h2>
          {section.props?.body && <p className="preview__body">{section.props.body}</p>}
          {Array.isArray(section.props?.paragraphs) &&
            section.props.paragraphs.map((p, i) => (
              <p className="preview__body" key={i}>
                {p}
              </p>
            ))}
        </section>
      ))}
    </div>
  );
}
