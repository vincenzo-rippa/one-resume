// Shared layout primitives built on the design tokens. Kept separate from
// tokens.typ (pure values) so the section partials share one set of building
// blocks — section headings, article heads, bullet lists, period formatting.

#import "tokens.typ": *

/// Uppercase, bold section heading with a 1.5pt accent underline. `sticky`
/// keeps it attached to the following block, so a page break can never leave
/// the title orphaned at the bottom of a page. `title` is a plain string.
#let section-heading(title) = block(
  width: 100%,
  below: space-heading-mb,
  breakable: false,
  sticky: true,
)[
  #text(
    size: text-section-heading,
    weight: "bold",
    tracking: 0.04em,
    fill: color-text,
    upper(title),
  )
  #v(space-heading-pb, weak: false)
  #line(
    length: 100%,
    stroke: (paint: color-accent, thickness: heading-rule-width),
  )
]

/// "start — end" period meta. The end word is literal markdown text (e.g. a
/// localized "Present"); there is no sentinel and no substitution.
#let fmt-period(period) = period.start + " — " + period.end

/// An article head kept together across a page break: the title block, then the
/// muted meta line (date · location, etc.). `title` is pre-built content so each
/// caller styles its own title; the meta line + spacing are shared.
#let article-head(title, meta) = block(breakable: false)[
  #block(below: title-to-meta)[#title]
  #text(size: text-meta, weight: "medium", fill: color-text-meta, meta)
]

/// A bullet list. The caller sets the surrounding text/par context (size +
/// fill); this owns only the "– " glyph and the inter-item spacing, so every
/// list in the document looks identical.
#let bullets(items) = {
  for item in items {
    block(below: bullet-spacing)[– #item]
  }
}
