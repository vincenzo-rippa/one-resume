// Design tokens — colours, type sizes, spacing.
// All derived opaque values assume a white page background.

// ── Colour palette ────────────────────────────────────────────────────────────

// Primary palette (matches globals.css light-mode variables)
#let color-text   = rgb("#1a1a1a")
#let color-accent = rgb("#0d7a4a")

// Opaque approximations of CSS color-mix(in srgb, text N%, transparent) on white:
//   effective = N% × #1a1a1a + (100-N)% × #ffffff
#let color-text-subtle    = rgb("#8d8d8d")  // 50 % text
#let color-text-meta      = rgb("#828282")  // 55 % text
#let color-text-soft      = rgb("#6b6b6b")  // 65 % text
#let color-text-muted     = rgb("#5f5f5f")  // 70 % text
#let color-body-soft      = rgb("#3d3d3d")  // 85 % text
#let color-body           = rgb("#2b2b2b")  // 93 % text

// Border colours
#let color-border         = rgb("#e4e4e4")  // text 12 % — thin rule (header underline)
#let color-header-border  = rgb("#aad0c0")  // accent 35 % on white — header separator

// ── Typography ────────────────────────────────────────────────────────────────

// Active font family. Pinned to a bundled font for reproducible output
// across machines — the build passes --font-path export-pdf/fonts plus
// --ignore-system-fonts, so only TTFs committed under export-pdf/fonts/ are
// considered. To swap families: drop the new family under
// export-pdf/fonts/<Family>/ (any layout — Typst walks recursively) and set
// this constant to its reported family name (run `typst fonts
// --font-path export-pdf/fonts --ignore-system-fonts` to list them).
//
// "Inter 18pt" is Inter's body-text optical-size variant; it covers every
// size used here (9–15pt).
#let font-family = "Inter 18pt"

// Text sizes (all in pt). Bumped +1pt from the original CSS-derived sizes for
// a slightly larger, more readable PDF.
#let text-base             = 10pt   // root
#let text-name             = 14pt     // CV name heading
#let text-headline         = 10pt   // job headline
#let text-tagline          = 9pt   // tagline (italic, accent)
#let text-contact          = 9pt     // contact block
#let text-section-heading  = 11pt     // section titles
#let text-exp-title        = 11pt   // company — role
#let text-meta             = 8pt    // date / location meta
#let text-bullet           = 10pt     // bullet list items
#let text-about            = 10pt     // about paragraphs
#let text-tech             = 9pt     // selected technologies line
#let text-education        = 10pt     // education items
#let text-footer           = 8pt      // GDPR footer

// ── Spacing ───────────────────────────────────────────────────────────────────
//
// Values are tuned to visually match the Chromium-printed reference output,
// which has more breathing room than its raw CSS margins suggest (the browser
// engine adds default block spacing on top of CSS values). Tweak by inspection
// against public/cv/en.pdf if the design target changes.
#let space-section    = 14pt   // between major sections
#let space-heading-mb = 14pt   // below section heading block
#let space-heading-pb = 3.5pt  // gap between heading text and its rule
#let header-mb        = 10pt   // below header separator rule
#let article-pb       = 14pt   // between experience articles
#let bullet-spacing   = 10pt   // between bullet items
#let meta-to-bullets  = 14pt    // gap between job meta line and first bullet
#let about-para-mb    = 7pt    // between about paragraphs
#let education-mb     = 7pt    // between education entries
#let identity-stack   = 0.7em  // between name / headline / tagline in headers
#let title-to-meta    = 7pt    // gap between job/project title and date meta

// Global text leading (line-height within paragraphs). 0.55em at the 10.5pt
// base ≈ 1.55 line-height, looser than the print CSS reference for breathing
// room. Used by main.typ #set par + per-block #set par overrides.
#let body-leading     = 0.55em

// ── Strokes ───────────────────────────────────────────────────────────────────

#let heading-rule-width = 1.5pt

// ── cv-special ────────────────────────────────────────────────────────────────

#let special-photo-size = 4.5cm  // square headshot in the special header

// ── Shared helper: section heading ───────────────────────────────────────────

/// Renders an uppercase, bold section heading with a 1.5pt accent underline.
/// `title` is a plain string.
// `sticky: true` keeps the heading attached to the next block, so a page
// break can never leave the title orphaned at the bottom of a page.
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
