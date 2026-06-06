#import "tokens.typ": *

/// Strips common URL prefixes for display in the contact block.
#let strip-url(url) = {
  if url.starts-with("mailto:")      { return url.slice(7) }
  if url.starts-with("https://www.") { return url.slice(12) }
  if url.starts-with("https://")     { return url.slice(8) }
  if url.starts-with("http://www.")  { return url.slice(11) }
  if url.starts-with("http://")      { return url.slice(7) }
  url
}

/// Two-column header: identity (left, bottom-aligned) + contact block (right, bottom-aligned).
/// Followed by a thin accent separator rule.
#let cv-header(cv, labels) = {
  grid(
    columns: (1fr, 5.8cm),
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
    // Each line: location, each contact URL, portfolio label. `align(right, …)`
    // explicitly right-aligns lines within the multi-line paragraph (cell-level
    // alignment only positions the block, not its inner lines).
    align(right)[
      #set text(size: text-contact, fill: color-text-muted)
      #set par(leading: 0.5em)
      #cv.location.based \
      #cv.location.availability \
      #for (_, url) in cv.contacts.pairs() [
        #strip-url(url) \
      ]
      #labels.portfolio: #strip-url(cv.portfolio)
    ],
  )

  // Separator rule below header
  v(space-heading-pb)
  line(length: 100%, stroke: (paint: color-header-border, thickness: 1pt))
  v(header-mb)
}

/// cv-special header: square photo (left) + identity & left-aligned contact
/// block (right). No separator rule. `special` carries the city prefix and the
/// uppercase header-extra line (both optional). `photo` is pre-built `image`
/// content (or `none`) — it must be constructed by the caller so its file
/// path resolves relative to the top-level template, not this lib file.
#let cv-special-header(cv, special, portfolio-label, photo: none) = {
  let tagline = if cv.taglineShort != "" { cv.taglineShort } else { cv.tagline }

  // Identity + contacts column.
  let identity = {
    stack(
      spacing: identity-stack,
      text(size: text-name, weight: "bold", fill: color-text, cv.name),
      text(size: text-headline, weight: "semibold", fill: color-text, cv.headline),
      text(size: text-tagline, style: "italic", fill: color-accent, tagline),
    )
    v(8pt)
    set text(size: text-contact, fill: color-text-muted)
    set par(leading: 0.5em)
    let based = if special.city != "" {
      special.city + " " + cv.location.based
    } else {
      cv.location.based
    }
    [
      #based\
      #for (_, url) in cv.contacts.pairs() [
        #strip-url(url)\
      ]
      #portfolio-label: #strip-url(cv.portfolio)
    ]
    if special.headerExtra != "" {
      v(8pt)
      text(
        weight: "semibold",
        fill: color-text,
        tracking: 0.04em,
        upper(special.headerExtra),
      )
    }
  }

  // Photo on the left when present; otherwise identity spans full width.
  if photo != none {
    grid(
      columns: (special-photo-size, 1fr),
      column-gutter: 2cm,
      align: (left + top, left + top),
      box(
        width: special-photo-size,
        height: special-photo-size,
        radius: 3pt,
        clip: true,
        photo,
      ),
      identity,
    )
  } else {
    identity
  }

  v(space-section)
}
