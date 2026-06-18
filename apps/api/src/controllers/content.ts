import type { RouterContext } from "@koa/router";
import { buildContent, ContentError } from "@one-resume/content";
import type { ContentRepository } from "../ports.ts";
import { IoError } from "../errors.ts";

export async function getContent(ctx: RouterContext): Promise<void> {
  try {
    const repo = ctx.contentRepository as ContentRepository;
    const { cv, projects } = ctx.query;

    ctx.assert(
      typeof cv === "string" && cv.length > 0,
      400,
      "'cv' query parameter is required, must be a string",
    );
    let projectsMarkdown;
    const cvMarkdown = await repo.getContent(cv);
    if (typeof projects === "string" && projects.length > 0) {
      projectsMarkdown = await repo.getContent(projects);
    }

    const data = buildContent({ cvMarkdown, projectsMarkdown });
    ctx.status = 200;
    ctx.body = data;
  } catch (err) {
    if (err instanceof IoError) {
      ctx.status = err.status;
    } else if (err instanceof ContentError) {
      ctx.status = 200;
    } else {
      ctx.status = 500;
    }
    ctx.body = err;
  }
}
