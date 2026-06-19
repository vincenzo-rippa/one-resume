// ─── CV layout ───────────────────────────────────────────────────────────────
//
// Compile with:
//   typst compile --input data=.cache/<uuid>.json cv.typ output.pdf
//
// One adaptive template for every CV: the Selected Projects section renders only
// when `projects` is non-empty, so a CV with an embedded projects section and a
// CV without one share a single template — no variants.
//
// Data shape (JSON) — the parsed CV (@one-resume/domain ParsedCv):
//   { profile, labels, experiences, education, projects, footer, keywords }
//   profile.contacts is an ordered list of { label, value } captured from the
//   header; labels = { about, experience, education, technologies, projects }
//   (section titles captured from the markdown headings, not a dictionary).

#import "lib/tokens.typ": *
#import "lib/header.typ": cv-header
#import "lib/about.typ": cv-about
#import "lib/experience.typ": cv-experience
#import "lib/education.typ": cv-education
#import "lib/project.typ": cv-projects
#import "lib/footer.typ": cv-footer

// ── Data ─────────────────────────────────────────────────────────────────────

#let d      = json(sys.inputs.at("data"))
#let cv     = d.profile
#let labels = d.labels

// ── Document metadata (SEO/ATS keywords from the markdown comment) ────────────

#set document(keywords: d.at("keywords", default: ()))

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

#cv-header(cv)
#cv-about(cv, labels)
#cv-experience(d.experiences, labels)
// Selected Projects — rendered only when the CV embeds a projects section.
#if d.projects.len() > 0 {
  cv-projects(d.projects, labels.projects)
}
#if d.education.len() > 0 {
  cv-education(d.education, labels)
}
#cv-footer(d.footer)
