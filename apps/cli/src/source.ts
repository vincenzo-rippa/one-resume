// Filesystem ContentSource: reads markdown from a root directory. A relative
// path resolves against the root; an absolute path is read as-is (so `--input`
// can point anywhere). The api's GitHubRepository is the same port over a repo.

import { resolve } from "node:path";
import type { ContentSource } from "@one-resume/content";
import { readTextRequired } from "./io.ts";

export class FsContentSource implements ContentSource {
  constructor(private readonly root: string) {}

  read(path: string): Promise<string> {
    return readTextRequired(resolve(this.root, path));
  }
}
