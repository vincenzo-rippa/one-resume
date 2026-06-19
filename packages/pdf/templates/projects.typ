// ─── Projects — standalone layout ────────────────────────────────────────────
//
// Compile with:
//   typst compile --input data=.cache/<uuid>.json projects.typ output.pdf
//
// Data shape (JSON) — @one-resume/domain ParsedProjects:
//   { label, projects }
//   `label` is the captured section title; `projects` are the captured entries.

#import "lib/tokens.typ": *
#import "lib/project.typ": cv-projects

// ── Data ─────────────────────────────────────────────────────────────────────

#let d = json(sys.inputs.at("data"))

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

#cv-projects(d.projects, d.label)
