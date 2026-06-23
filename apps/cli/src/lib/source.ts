// Filesystem DocumentSource: reads markdown from a root directory. A relative
// path resolves against the root; an absolute path is read as-is (so `--input`
// can point anywhere). The api's GitHubDocumentSource is the same port over a repo.

import { resolve } from "node:path";
import type { DocumentSource } from "@one-resume/domain";
import { readTextRequired } from "./io.ts";

export class FsDocumentSource implements DocumentSource {
  constructor(private readonly root: string) {}

  async read(path: string): Promise<string> {
    return await readTextRequired(resolve(this.root, path));
  }
}
