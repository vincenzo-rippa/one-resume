import type { RouterContext } from "@koa/router";
import { parse, ParseError } from "@one-resume/parser";
import { IoError } from "../errors.ts";
import { ContentQuery } from "../models.ts";

/**
 * GET /v1/content?cv=…&projects=… — the parsed CV the site consumes, as JSON.
 *
 * Reads the CV markdown (and, when `projects` is given, a standalone projects
 * doc) through the DocumentSource and parses each. The standalone projects'
 * entries and captured section label replace the CV's embedded ones — the merge
 * the site's content.json needs. Read errors (404/502) propagate as-is; a parse
 * failure on otherwise-readable markdown is a 422.
 */
export async function getContent(ctx: RouterContext): Promise<void> {
  const { cv, projects } = ContentQuery.parse(ctx.query);
  const source = ctx.documentSource;

  try {
    const parsed = parse(await source.read(cv), "cv");
    if (projects !== undefined) {
      const standalone = parse(await source.read(projects), "projects");
      parsed.labels = { ...parsed.labels, projects: standalone.label };
      parsed.projects = standalone.projects;
    }
    ctx.body = parsed;
  } catch (err) {
    if (err instanceof ParseError) throw new IoError(422, err.message);
    throw err;
  }
}
