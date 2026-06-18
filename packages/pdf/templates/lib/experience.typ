#import "tokens.typ": *

/// Single experience article: company — role, meta, bullet list.
#let experience-article(exp, ongoing-label) = {
  let end-label = if exp.period.end == "ongoing" { ongoing-label } else { exp.period.end }
  let date-line = exp.period.start + " — " + end-label
  let loc = exp.at("location", default: "")
  if loc != "" { date-line += " · " + loc }

  block(width: 100%, breakable: true)[
    // Job header — title + meta kept together, never split mid-block.
    #block(breakable: false)[
      // Company — Role
      #block(below: title-to-meta)[
        #text(size: text-exp-title, weight: "bold",     fill: color-accent,      exp.company)
        #text(size: text-exp-title, weight: "medium",   fill: color-text-subtle, " — ")
        #text(size: text-exp-title, weight: "semibold", fill: color-text,        exp.role)
      ]
      // Date · Location
      #text(size: text-meta, weight: "medium", fill: color-text-meta, date-line)
    ]

    // Explicit gap before bullets — block.above/below collapse with adjacent
    // siblings under Typst's max-rule and rendered as ~0pt here.
    #v(meta-to-bullets, weak: true)

    // Bullet list — generous inter-item spacing matches the print reference.
    #set text(size: text-bullet, fill: color-text)
    #set par(leading: body-leading)
    #for item in exp.description {
      block(below: bullet-spacing)[– #item]
    }
  ]
}

/// Full experience section.
/// `v(article-pb, weak: true)` produces the inter-article gap reliably; it
/// won't double-up if the article ends at a page break.
#let cv-experience(experiences, labels) = block(
  below: space-section,
  width: 100%,
)[
  #section-heading(labels.experience)
  #for (i, exp) in experiences.enumerate() {
    if i > 0 { v(article-pb, weak: true) }
    experience-article(exp, labels.ongoing)
  }
]
