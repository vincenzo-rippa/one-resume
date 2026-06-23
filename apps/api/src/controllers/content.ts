import type { RouterContext } from "@koa/router";
import { ParseError, parseFrom } from "@one-resume/parser";
import { AppError } from "../lib/error.ts";
import { ContentQuery } from "../models.ts";
import type { ParsedCv, ParsedProjects } from "@one-resume/domain";

export async function getContent(ctx: RouterContext): Promise<void> {
  const { cv, projects } = ContentQuery.parse(ctx.query);
  const source = ctx.documentSource;

  try {
    const parsed = (await parseFrom(source, cv, "cv")) as ParsedCv;
    if (projects !== undefined) {
      const standalone = (await parseFrom(
        source,
        projects,
        "projects",
      )) as ParsedProjects;
      parsed.labels = { ...parsed.labels, projects: standalone.label };
      parsed.projects = standalone.projects;
    }
    ctx.body = parsed;
  } catch (err) {
    if (err instanceof ParseError) throw new AppError(422, err.message);
    throw err;
  }
}
