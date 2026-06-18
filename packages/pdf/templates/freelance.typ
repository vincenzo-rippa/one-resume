// ─── CV — freelance layout ───────────────────────────────────────────────────
//
// Compile with:
//   typst compile --input data=.cache/<uuid>.json freelance.typ output.pdf
//
// Identical to main.typ for the CV sections but renders a "Selected Projects"
// section (H2) between Education and the GDPR footer. The data ships projects
// in the same shape as the standalone projects template.
//
// Data shape (JSON):
//   { profile, experiences, education, projects, footer, labels }
//   labels = { about, experience, education, selectedTechnologies, projects,
//              portfolio, ongoing, languages, otherSkills }
//   `footer` is the GDPR text from the markdown.

#import "lib/tokens.typ": *
#import "lib/header.typ": cv-header
#import "lib/about.typ": cv-about
#import "lib/experience.typ": cv-experience
#import "lib/education.typ": cv-education
#import "lib/project.typ": project-article
#import "lib/footer.typ": cv-footer

// ── Data ─────────────────────────────────────────────────────────────────────

#let d      = json(sys.inputs.at("data"))
#let cv     = d.profile
#let labels = d.labels

#set document(keywords: d.at("keywords", default: ()))

// ── Page & text defaults ─────────────────────────────────────────────────────

#set page(paper: "a4", margin: 18mm)

#set text(
  font:      font-family,
  size:      text-base,
  fill:      color-text,
  ligatures: false,
)

#set par(leading: body-leading, spacing: 0.6em, justify: false)
#set heading(numbering: none)

// ── Layout ───────────────────────────────────────────────────────────────────

#cv-header(cv, labels)
#cv-about(cv, labels)
#cv-experience(d.experiences, labels)
// Selected Projects (the section that distinguishes freelance from main).
#if d.projects.len() > 0 {
  block(below: space-section, width: 100%)[
    #section-heading(labels.projects)
    #for (i, project) in d.projects.enumerate() {
      if i > 0 { v(article-pb, weak: true) }
      project-article(project, labels.ongoing, labels.technologies)
    }
  ]
}
#if d.education.len() > 0 {
  cv-education(d.education, labels)
}

#cv-footer(d.footer)
