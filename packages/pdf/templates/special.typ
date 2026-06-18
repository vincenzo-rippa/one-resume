// ─── CV — special variant (private, with photo) ──────────────────────────────
//
// Compile with:
//   typst compile --input data=.cache/<uuid>.json special.typ output.pdf
//
// The build wrapper (export-pdf/scripts/build.ts --template special) handles data
// injection. Distinct from main.typ: tighter page margins, a header photo,
// no header separator rule, and a languages / other-skills block appended to
// the About section.
//
// Data shape (JSON):
//   { profile, experiences, education, footer, labels, special }
//   footer           — GDPR text from the CV markdown
//   special.photo    — Typst-resolvable path (the build wrapper copies the
//                      file from content/special/<photo> into the .cache dir
//                      next to this template)
//   special.city / .headerExtra / .languages / .otherSkills come from
//                      content/special/{lang}-special.meta.yaml

#import "lib/tokens.typ": *
#import "lib/header.typ": cv-special-header
#import "lib/about.typ": cv-about
#import "lib/experience.typ": cv-experience
#import "lib/education.typ": cv-education
#import "lib/footer.typ": cv-footer

// ── Data ─────────────────────────────────────────────────────────────────────

#let d       = json(sys.inputs.at("data"))
#let cv      = d.profile
#let labels  = d.labels
#let special = d.special

#set document(keywords: d.at("keywords", default: ()))

// ── Page & text defaults (tighter margins than main.typ) ─────────────────────

#set page(
  paper: "a4",
  margin: (x: 13mm, y: 12mm),
)

#set text(
  font:      font-family,
  size:      text-base,
  fill:      color-text,
  ligatures: false,
)

#set par(leading: body-leading, spacing: 0.6em, justify: false)
#set heading(numbering: none)

// ── About-section extras: languages + other skills ───────────────────────────

// Wider gap before extras and explicit `below` between the two lines so the
// three "technology-like" rows (Selected Technologies — emitted by cv-about
// just above — then Languages, then Other Skills) breathe distinctly.
#let about-extra = {
  v(8pt)
  set text(size: text-tech, fill: color-text)
  set par(leading: 0.55em)
  block(below: 8pt)[
    #text(weight: "semibold", fill: color-accent, labels.languages + ": ")#special.languages.map(l => l.label + " - " + l.level).join("  •  ")
  ]
  block[
    #text(weight: "semibold", fill: color-accent, labels.otherSkills + ": ")#special.otherSkills
  ]
}

// Build the header photo here (not in lib/header.typ) so its cache path
// resolves relative to this top-level template.
#let header-photo = if special.photo != none and special.photo != "" {
  image(special.photo, width: 100%, height: 100%, fit: "cover")
} else {
  none
}

// ── Layout ───────────────────────────────────────────────────────────────────

#cv-special-header(cv, special, labels.portfolio, photo: header-photo)
#cv-about(cv, labels, extra: about-extra)
#cv-experience(d.experiences, labels)
#if d.education.len() > 0 {
  cv-education(d.education, labels)
}
#cv-footer(d.footer)
