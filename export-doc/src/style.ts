// Shared docx style tokens.
//
// docx unit reminders:
//   - run.size is in HALF-points (22 = 11pt)
//   - paragraph.spacing.line is in 240ths (276 ≈ 1.15× line height)
//   - paragraph.spacing.{before,after} is in TWIPS (1/20 pt)
//   - page.margin is in twips (1440 = 1 inch; 900 ≈ 0.625")

export const FONT = "Arial";

export const SIZE_TITLE = 30;    // 15pt — name/title
export const SIZE_HEADING = 24;  // 12pt — section H2
export const SIZE_BODY = 22;     // 11pt — body
export const LINE_BODY = 276;    // ~1.15× line height

export const PAGE_MARGIN = 900;  // ~0.625" all sides

export const SPACING = {
  sectionBefore: 280,
  sectionAfter: 120,
  bodyAfter: 80,
  tightAfter: 60,
  bulletAfter: 60,
  contactAfter: 40,
  headerTight: 40,
} as const;
