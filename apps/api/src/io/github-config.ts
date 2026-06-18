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

  /**
   * A safe-to-expose view for error payloads: the PAT is masked (`"****"` when
   * set, `"absent"` when not) and any unset field reads `"missing"` rather than
   * an empty string. NEVER returns the real token.
   */
  redacted(): Record<string, string> {
    const orMissing = (v: string | undefined): string =>
      v && v.length > 0 ? v : "missing";
    return {
      gitHubPat: this.gitHubPat.length > 0 ? "****" : "missing",
      gitHubOwner: orMissing(this.gitHubOwner),
      gitHubRoot: orMissing(this.gitHubRoot),
      gitHubRef: orMissing(this.gitHubRef),
    };
  }
}
