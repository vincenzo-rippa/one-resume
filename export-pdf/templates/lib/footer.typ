#import "tokens.typ": *

/// Legal/footer block (e.g. GDPR notice) with an accent top border.
///
/// The footer text is content, not a UI label — it's parsed from the CV
/// markdown source and passed in by the top-level template. When empty, the
/// whole block is omitted (no rule, no spacing).
#let cv-footer(footer-text) = if footer-text != "" {
  block(
    above: space-section,
    below: 0pt,
    width: 100%,
    breakable: false,
  )[
    #line(
      length: 100%,
      stroke: (paint: color-accent, thickness: heading-rule-width),
    )
    #v(4pt)
    #text(size: text-footer, weight: "semibold", fill: color-text, footer-text)
  ]
}
