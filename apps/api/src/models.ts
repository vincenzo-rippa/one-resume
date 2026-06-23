import { z } from "zod";

/**
 * A safe, relative `.md` path: no traversal, no absolute (POSIX or Windows).
 * `z.string()` also rejects a repeated query param (which arrives as an array)
 * and a missing one — both surface as a ZodError → 400.
 */
const safeMdPath = z
  .string()
  .min(1)
  .endsWith(".md", "must be a relative .md filepath")
  .refine(
    (p) =>
      !p.includes("..") && !p.startsWith("/") && !/^[a-zA-Z]:[\\/]/.test(p),
    "must be a relative .md filepath (no traversal / absolute)",
  );

/** The /v1/content query string: a required `cv` path and an optional `projects`. */
export const ContentQuery = z.object({
  cv: safeMdPath,
  projects: safeMdPath.optional(),
});

/**
 * The render request body (POST /v1/pdf and /v1/docx): a single render job.
 * `input` is a relative `.md` path read through the `DocumentSource`; `type`
 * selects the parser. This mirrors the DESIGN.md manifest job shape — the `op` is
 * implied by the route and `output` is omitted, so the rendered document is
 * streamed back rather than written.
 */
export const RenderRequest = z.object({
  type: z.enum(["cv", "projects"]),
  input: safeMdPath,
});

export type RenderJob = z.infer<typeof RenderRequest>;
