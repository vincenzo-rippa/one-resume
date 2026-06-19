import type { RouterContext } from "@koa/router";
import { loadContent, ContentError, type ContentJob } from "@one-resume/content";
import { IoError } from "../errors.ts";

/** Reject anything that isn't a safe, relative `.md` path (no traversal / absolute). */
function assertSafePath(ctx: RouterContext, path: string, type: string): void {
  const isSafe =
    path.endsWith(".md") &&
    !path.includes("..") &&
    !path.startsWith("/") &&
    !/^[a-zA-Z]:[\\/]/.test(path);
  ctx.assert(
    isSafe,
    400,
    `'${type}' query parameter must be a relative .md filepath: ${path}`,
  );
}

export async function getContent(ctx: RouterContext): Promise<void> {
  const source = ctx.contentSource;
  const { cv, projects } = ctx.query;

  ctx.assert(
    typeof cv === "string" && cv.length > 0,
    400,
    "'cv' query parameter is required and must be a string",
  );
  assertSafePath(ctx, cv, "cv");

  const job: ContentJob = { cv };
  if (typeof projects === "string" && projects.length > 0) {
    assertSafePath(ctx, projects, "projects");
    job.projects = projects;
  }

  try {
    ctx.body = await loadContent(source, job);
  } catch (err) {
    if (err instanceof ContentError) {
      throw new IoError(422, err.message);
    }
    throw err;
  }
}
