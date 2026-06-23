import { Octokit, RequestError } from "octokit";
import type { DocumentSource } from "@one-resume/domain";
import { GitHubConfig } from "./config.ts";
import { AppError } from "./error.ts";

const GITHUB_TIMEOUT_MS = 10_000;

function isTimeout(err: unknown): boolean {
  const name = (err as { name?: string }).name;
  const causeName = (err as { cause?: { name?: string } }).cause?.name;
  return (
    name === "TimeoutError" ||
    name === "AbortError" ||
    causeName === "TimeoutError" ||
    causeName === "AbortError"
  );
}

export class GitHubDocumentSource implements DocumentSource {
  private readonly octokit: Octokit;

  constructor(private readonly githubConfig: GitHubConfig) {
    this.octokit = new Octokit({ auth: this.githubConfig.gitHubPat });
  }

  async read(path: string): Promise<string> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.githubConfig.gitHubOwner,
        repo: this.githubConfig.gitHubRoot,
        path,
        ref: this.githubConfig.gitHubRef,
        request: { signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS) },
      });

      if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
        throw new AppError(404, `No file found at path: ${path}`, {
          ...this.githubConfig.redacted(),
          path,
        });
      }

      return Buffer.from(data.content, "base64").toString("utf8");
    } catch (err) {
      if (isTimeout(err)) {
        throw new AppError(
          504,
          `GitHub request timed out after ${GITHUB_TIMEOUT_MS}ms`,
          { ...this.githubConfig.redacted(), path },
        );
      }
      if (err instanceof RequestError) {
        throw new AppError(502, err.message, {
          ...this.githubConfig.redacted(),
          path,
        });
      }
      throw err;
    }
  }
}
