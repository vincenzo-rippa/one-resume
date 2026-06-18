export class GitHubConfig {
  constructor(
    /** GitHub Personal Access Token (GITHUB_PAT). */
    readonly gitHubPat: string,
    /** The GitHub repository owner (GITHUB_OWNER). */
    readonly gitHubOwner: string,
    /** The root directory of the GitHub repository (GITHUB_ROOT). */
    readonly gitHubRoot: string,
    /** The reference (branch or tag) of the GitHub repository (GITHUB_REF). */
    readonly gitHubRef?: string,
  ) {}

  static fromEnv(): GitHubConfig {
    return new GitHubConfig(
      process.env.GITHUB_PAT ?? "",
      process.env.GITHUB_OWNER ?? "",
      process.env.GITHUB_ROOT ?? "",
      process.env.GITHUB_REF,
    );
  }
}
