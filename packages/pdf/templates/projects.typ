// ─── Projects — selected-projects layout ─────────────────────────────────────
//
// Compile with:
//   typst compile --input data=.cache/<uuid>.json projects.typ output.pdf
//
// The build wrapper (export-pdf/scripts/build.ts) handles data injection.
//
// Data shape (JSON):
//   { projects, labels }
//   where labels = { projects, ongoing }

#import "lib/tokens.typ": *
#import "lib/project.typ": project-article

// ── Data ─────────────────────────────────────────────────────────────────────

#let d      = json(sys.inputs.at("data"))
#let labels = d.labels

// ── Page & text defaults ─────────────────────────────────────────────────────

#set page(
  paper: "a4",
  margin: 18mm,
)

#set text(
  font:      font-family,
  size:      text-base,
  fill:      color-text,
  ligatures: false,
)

#set par(leading: body-leading, justify: false)
#set heading(numbering: none)

// ── Layout ───────────────────────────────────────────────────────────────────

#block(
  below: space-section,
  width: 100%,
)[
  #section-heading(labels.projects)
  #for (i, project) in d.projects.enumerate() {
    if i > 0 { v(article-pb, weak: true) }
    project-article(project, labels.ongoing, labels.technologies)
  }
]