import { marked, type Token } from "marked";
import type {
  ParsedCv,
  ParsedProjects,
  Profile,
  SectionLabels,
} from "@one-resume/domain";
import { TokenStream } from "./classes/TokenStream.ts";
import { plainText } from "./helpers/inline.ts";
import {
  readName,
  readHeader,
  readHeadline,
  readTaglines,
} from "./readers/readHeader.ts";
import { readAbout, readTechnologies } from "./readers/readSummary.ts";
import { readExperienceSection } from "./readers/readExperiences.ts";
import { readEducationSection } from "./readers/readEducation.ts";
import {
  readOptionalProjectsSection,
  readProjectsBlock,
} from "./readers/readProjects.ts";
import { readFooter } from "./readers/readFooter.ts";
import { readMetadata } from "./readers/readMetadata.ts";

function streamOf(markdown: string): TokenStream {
  return new TokenStream(marked.lexer(markdown) as Token[], markdown);
}

/**
 * Parse a CV. Fully POSITIONAL and language-agnostic: the fixed section order
 * (name → header → headline → about → technologies → experience → education →
 * [projects] → footer) drives parsing; each section reader captures its own
 * title into `labels`. No dictionaries, no anchors.
 */
function parseCv(markdown: string): ParsedCv {
  const stream = streamOf(markdown);

  const name = readName(stream);
  const header = readHeader(stream);
  const headline = readHeadline(stream);
  const { tagline, taglineShort } = readTaglines(stream);
  const about = readAbout(stream);
  const technologies = readTechnologies(stream);
  const experience = readExperienceSection(stream);
  const education = readEducationSection(stream);
  const projects = readOptionalProjectsSection(stream);
  const footer = readFooter(stream);
  const { keywords } = readMetadata(markdown);

  const profile: Profile = {
    name,
    location: header.location,
    contacts: header.contacts,
    headline,
    tagline,
    taglineShort,
    aboutParagraphs: about.paragraphs,
    selectedTechnologies: technologies.items,
  };
  const labels: SectionLabels = {
    about: about.label,
    experience: experience.label,
    education: education.label,
    technologies: technologies.label,
    projects: projects.label,
  };
  return {
    profile,
    labels,
    experiences: experience.experiences,
    education: education.education,
    projects: projects.projects,
    footer,
    keywords,
  };
}

/** Parse a standalone projects document: a `## <label>` heading + `###` entries. */
function parseProjects(markdown: string): ParsedProjects {
  const stream = streamOf(markdown);
  const label = plainText(
    stream.consumeHeading([2], "an H2 projects section as the first line").tokens,
  );
  const projects = readProjectsBlock(stream, 3);
  if (projects.length === 0) throw stream.error("no project entries found");
  return { label, projects };
}

// One command. Strongly typed: the return type follows `type`, and any value
// outside the union is a compile error (no runtime unsupported-type branch).
export function parse(markdown: string, type: "cv"): ParsedCv;
export function parse(markdown: string, type: "projects"): ParsedProjects;
export function parse(
  markdown: string,
  type: "cv" | "projects",
): ParsedCv | ParsedProjects {
  return type === "cv" ? parseCv(markdown) : parseProjects(markdown);
}
