export class GitHubConfig {
  constructor(
    readonly gitHubPat: string,
    readonly gitHubOwner: string,
    readonly gitHubRoot: string,
    readonly gitHubRef?: string,
  ) {}

  static fromEnv(): GitHubConfig {
    const pat = process.env.GITHUB_PAT;
    const owner = process.env.GITHUB_OWNER;
    const root = process.env.GITHUB_ROOT;

    if (!pat || !owner || !root) {
      console.error(
        "FATAL: GITHUB_PAT, GITHUB_OWNER and GITHUB_ROOT must be set (configure them in apps/api/.env).",
      );
      process.exit(1);
    }

    return new GitHubConfig(pat, owner, root, process.env.GITHUB_REF);
  }

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
