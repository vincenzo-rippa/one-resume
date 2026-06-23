import { z } from "zod";

const safeMdPath = z
  .string()
  .min(1)
  .endsWith(".md", "must be a relative .md filepath")
  .refine(
    (p) =>
      !p.includes("..") &&
      !p.startsWith("/") &&
      !p.startsWith("\\") &&
      !/^[a-zA-Z]:[\\/]/.test(p),
    "must be a relative .md filepath (no traversal / absolute)",
  );

export const ContentQuery = z.object({
  cv: safeMdPath,
  projects: safeMdPath.optional(),
});

export const RenderRequest = z.object({
  type: z.enum(["cv", "projects"]),
  input: safeMdPath,
});

export type RenderJob = z.infer<typeof RenderRequest>;
