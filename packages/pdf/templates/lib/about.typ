#import "tokens.typ": *
#import "blocks.typ": *

/// About section: paragraphs + the selected-technologies line.
#let cv-about(cv, labels) = block(
  below: space-section,
  width: 100%,
)[
  #section-heading(labels.about)

  // About paragraphs — one block per paragraph for predictable spacing.
  #block(below: 8pt)[
    #set text(size: text-about, fill: color-text)
    #set par(leading: body-leading)
    #for p in cv.aboutParagraphs {
      block(below: about-para-mb)[#p]
    }
  ]
  #v(4pt)
  // Selected technologies — captured heading as the label.
  #block(below: 0pt)[
    #set text(size: text-tech)
    #text(weight: "semibold", fill: color-accent, labels.technologies + ": ")#text(
      fill: color-body-soft,
      cv.selectedTechnologies.join(" · "),
    )
  ]
]
