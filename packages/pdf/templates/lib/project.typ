#import "tokens.typ": *

/// Single project article: title, date · associated-with meta, description,
/// optional highlight bullets, technologies line.
#let project-article(project, ongoing-label, technology-label) = {
  let end-label = if project.period.end == "ongoing" {
    ongoing-label
  } else {
    project.period.end
  }
  let meta = project.period.start + " — " + end-label
  let assoc = project.at("associatedWith", default: "")
  if assoc != "" { meta += " · " + assoc }

  block(width: 100%, breakable: true)[
    // Title + meta — kept together.
    #block(breakable: false)[
      #block(below: title-to-meta)[
        #text(size: text-exp-title, weight: "bold", fill: color-accent, project.title)
      ]
      #text(size: text-meta, weight: "medium", fill: color-text-meta, meta)
    ]

    #v(meta-to-bullets, weak: true)

    // Description prose.
    #block(width: 100%)[
      #set text(size: text-bullet, fill: color-body)
      #set par(leading: body-leading)
      #project.description
    ]

    // Optional highlight bullets.
    #if project.highlights.len() > 0 {
      v(bullet-spacing, weak: true)
      set text(size: text-bullet, fill: color-body)
      set par(leading: body-leading)
      for item in project.highlights {
        block(below: bullet-spacing)[– #item]
      }
    }

    // Technologies line.
    #if project.technologies.len() > 0 {
      v(bullet-spacing, weak: true)
      set text(size: text-tech)
      text(weight: "semibold", fill: color-accent, technology-label + ": ");text(
        fill: color-body-soft,
        project.technologies.join(" · "),
      )
    }
  ]
}
