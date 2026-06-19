#import "tokens.typ": *
#import "blocks.typ": *

/// A single captured project field, rendered the way the author wrote it
/// (`field.inline`): an inline field is "Label: a · b" on one line; a list
/// field (e.g. `**Highlights**` + a bullet list) is a labelled bullet list.
#let project-field(field) = {
  v(bullet-spacing, weak: true)
  set text(size: text-bullet)
  if field.inline {
    text(weight: "semibold", fill: color-accent, field.label + ": ")
    text(fill: color-body, field.value.join(" · "))
  } else {
    text(weight: "semibold", fill: color-accent, field.label)
    set text(fill: color-body)
    set par(leading: body-leading)
    bullets(field.value)
  }
}

/// Single project article: title, period meta, description prose, then the
/// captured fields in order.
#let project-article(project) = {
  let title = text(
    size: text-exp-title,
    weight: "bold",
    fill: color-accent,
    project.title,
  )

  block(width: 100%, breakable: true)[
    #article-head(title, fmt-period(project.period))

    #v(meta-to-bullets, weak: true)

    // Description prose.
    #block(width: 100%)[
      #set text(size: text-bullet, fill: color-body)
      #set par(leading: body-leading)
      #project.description
    ]

    // Captured fields, in markdown order.
    #for field in project.fields {
      project-field(field)
    }
  ]
}

/// Full projects section — shared by a CV's embedded projects and the
/// standalone projects document. `label` is the captured section title.
#let cv-projects(projects, label) = block(
  below: space-section,
  width: 100%,
)[
  #section-heading(label)
  #for (i, project) in projects.enumerate() {
    if i > 0 { v(article-pb, weak: true) }
    project-article(project)
  }
]
