import { Octokit, RequestError } from "octokit";
import { GitHubConfig } from "./github-config.ts";
import type { ContentRepository } from "../ports.ts";
import { IoError } from "../errors.ts";

export class GitHubRepository implements ContentRepository {
  private readonly octokit: Octokit;

  constructor(private readonly githubConfig: GitHubConfig) {
    this.octokit = new Octokit({ auth: this.githubConfig.gitHubPat });
  }

  async getContent(path: string): Promise<string> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.githubConfig.gitHubOwner,
        repo: this.githubConfig.gitHubRoot,
        path,
        ref: this.githubConfig.gitHubRef,
      });

      if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
        throw new IoError(404, `No file found at path: ${path}`, {
          ...this.githubConfig,
          path,
        });
      }

      return Buffer.from(data.content, "base64").toString("utf8");
    } catch (err) {
      if (err instanceof RequestError) {
        throw new IoError(502, err.message, {
          ...this.githubConfig,
          path,
        });
      }
      throw err;
    }
  }
}
