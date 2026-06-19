#import "tokens.typ": *

/// Two-column header: identity (left, bottom-aligned) + contact block (right,
/// bottom-aligned), followed by a thin accent separator rule.
///
/// Contacts are whatever the markdown captured, in order: a labelled segment
/// renders "Label: value", a bare one (e.g. an email) renders the value alone.
/// No service is special-cased — there are no hardcoded labels here.
#let cv-header(cv) = {
  // Contact column width, reused as the budget for deciding whether a labelled
  // contact line fits on one line (see the contacts block below).
  let contact-w = 5.8cm

  grid(
    columns: (1fr, contact-w),
    column-gutter: 1.5cm,
    align: (left + bottom, right + bottom),

    // ── Identity ────────────────────────────────────────────────────────────
    stack(
      spacing: identity-stack,
      text(size: text-name, weight: "bold", fill: color-text, cv.name),
      text(size: text-headline, weight: "semibold", fill: color-text, cv.headline),
      text(size: text-tagline, style: "italic", fill: color-accent, cv.tagline),
    ),

    // ── Contacts ────────────────────────────────────────────────────────────
    // Location (two lines) then one line per captured contact. A labelled
    // contact shows "Label: value", but if that would overflow the column and
    // wrap, the label is dropped so the value stays on one line (the URL is
    // self-identifying). `align(right, …)` right-aligns the inner lines.
    align(right)[
      #set text(size: text-contact, fill: color-text-muted)
      #set par(leading: 0.5em)
      #cv.location.based \
      #cv.location.availability
      #for c in cv.contacts {
        linebreak()
        if c.label == "" {
          c.value
        } else {
          context {
            let labelled = c.label + ": " + c.value
            if measure(labelled).width > contact-w { c.value } else { labelled }
          }
        }
      }
    ],
  )

  // Separator rule below header
  v(space-heading-pb)
  line(length: 100%, stroke: (paint: color-header-border, thickness: 1pt))
  v(header-mb)
}
