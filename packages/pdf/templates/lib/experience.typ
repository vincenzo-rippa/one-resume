#import "tokens.typ": *
#import "blocks.typ": *

/// Single experience article: company — role, meta, bullet list.
#let experience-article(exp) = {
  let meta = fmt-period(exp.period)
  let loc = exp.at("location", default: "")
  if loc != "" { meta += " · " + loc }

  let title = (
    text(size: text-exp-title, weight: "bold", fill: color-accent, exp.company)
      + text(size: text-exp-title, weight: "medium", fill: color-text-subtle, " — ")
      + text(size: text-exp-title, weight: "semibold", fill: color-text, exp.role)
  )

  block(width: 100%, breakable: true)[
    // Title + meta kept together, never split mid-block.
    #article-head(title, meta)

    // Explicit gap before bullets — block.above/below collapse with adjacent
    // siblings under Typst's max-rule and render as ~0pt here.
    #v(meta-to-bullets, weak: true)

    // Bullet list — generous inter-item spacing matches the print reference.
    #set text(size: text-bullet, fill: color-text)
    #set par(leading: body-leading)
    #bullets(exp.description)
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
    experience-article(exp)
  }
]
