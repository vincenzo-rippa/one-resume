// ─── CV — main layout ────────────────────────────────────────────────────────
//
// Compile with:
//   typst compile --input data=.cache/<uuid>.json main.typ output.pdf
//
// The build wrapper (cv-pdf/scripts/build.ts) handles data injection automatically.
//
// Data shape (JSON):
//   { cvData, experiences, education, labels }
//   where cvData.footer is the GDPR / legal text (parsed from the CV markdown)
//   and labels = { about, experience, education, selectedTechnologies,
//                  portfolio, ongoing, languages, otherSkills }
//   (no footer in labels — it's content, supplied by the parser).

#import "lib/tokens.typ": *
#import "lib/header.typ": cv-header
#import "lib/about.typ": cv-about
#import "lib/experience.typ": cv-experience
#import "lib/education.typ": cv-education
#import "lib/footer.typ": cv-footer

// ── Data ─────────────────────────────────────────────────────────────────────

#let d      = json(sys.inputs.at("data"))
#let cv     = d.cvData
#let labels = d.labels

// ── Page & text defaults ─────────────────────────────────────────────────────

#set page(
  paper: "a4",
  margin: 18mm,
)

#set text(
  font:   font-family,
  size:   text-base,
  fill:   color-text,
  // Disable ligatures that sometimes confuse ATS readers
  ligatures: false,
)

#set par(
  leading:  body-leading,
  spacing:  0.6em,
  justify:  false,
)

// Remove default heading numbering (we render headings manually)
#set heading(numbering: none)

// ── Layout ───────────────────────────────────────────────────────────────────

#cv-header(cv, labels)
#cv-about(cv, labels)
#cv-experience(d.experiences, labels)
#if d.education.len() > 0 {
  cv-education(d.education, labels)
}
#cv-footer(cv.footer)
