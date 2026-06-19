import { Octokit, RequestError } from "octokit";
import type { ContentSource } from "@one-resume/content";
import { GitHubConfig } from "./github-config.ts";
import { IoError } from "../errors.ts";

export class GitHubRepository implements ContentSource {
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
      });

      if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
        throw new IoError(404, `No file found at path: ${path}`, {
          ...this.githubConfig.redacted(),
          path,
        });
      }

      return Buffer.from(data.content, "base64").toString("utf8");
    } catch (err) {
      if (err instanceof RequestError) {
        throw new IoError(502, err.message, {
          ...this.githubConfig.redacted(),
          path,
        });
      }
      throw err;
    }
  }
}
