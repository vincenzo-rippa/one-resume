#import "tokens.typ": *

/// About section: paragraphs + selected technologies line.
/// `extra` (optional content) is appended after the technologies line — used
/// by the cv-special template for the languages / other-skills lines.
#let cv-about(cv, labels, extra: none) = block(
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
  // Selected technologies
  #block(below: 0pt)[
    #set text(size: text-tech)
    #text(weight: "semibold", fill: color-accent, labels.selectedTechnologies + ": ")#text(
      fill: color-body-soft,
      cv.selectedTechnologies.join(" · "),
    )
  ]

  // Optional extra content (cv-special: languages + other skills)
  #if extra != none { extra }
]
