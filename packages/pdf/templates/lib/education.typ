#import "tokens.typ": *
#import "blocks.typ": *

/// Single education entry: `- ` bullet + Title [@ Institution] [— Subtitle].
/// Matches the print reference where education shares the same bullet style
/// as experience descriptions (both go through PrintListItem).
#let education-item(item) = {
  let institution = item.at("institution", default: "")
  let subtitle    = item.at("subtitle",    default: "")

  block(below: education-mb)[
    #set text(size: text-education, fill: color-text)
    – #text(weight: "semibold", item.title)
    #if institution != "" [
      #text(weight: "medium", fill: color-text-subtle, " @ ")#text(weight: "bold", fill: color-accent, institution)
    ]
    #if subtitle != "" [
      #text(weight: "medium", fill: color-text-subtle, " — ")#text(weight: "semibold", subtitle)
    ]
  ]
}

/// Full education section.
#let cv-education(education, labels) = block(
  below: space-section,
  width: 100%,
)[
  #section-heading(labels.education)
  #for item in education {
    education-item(item)
  }
]
