import { readFile, writeFile, copyFile, readdir, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import type { SourceResolver } from "core-parser/source";
import type { PipelineConfig } from "./config.ts";

/**
 * Reads content from the local filesystem, rooted at `baseDir`.
 *
 * Paths are resolved against `baseDir`; an absolute path is used as-is (node's
 * `resolve` short-circuits on absolute inputs), so a one-off absolute `--input`
 * works through the same source as base-relative bulk paths.
 *
 * `read` is the only `SourceResolver` method; `write`/`copy`/`list` are concrete
 * extras for node consumers (writing JSON/DOCX, copying the special photo,
 * enumerating a directory for `--all`). The resolved pipeline `config` is
 * carried read-only so importers can locate files (e.g. the special photo)
 * without re-resolving the environment.
 */
export class FileSystemSource implements SourceResolver {
  constructor(
    readonly baseDir: string,
    readonly config?: PipelineConfig,
  ) {}

  private abs(path: string): string {
    return resolve(this.baseDir, path);
  }

  /** Read UTF-8 text, or `null` when the file does not exist (ENOENT). */
  async read(sourceName: string): Promise<string | null> {
    try {
      return await readFile(this.abs(sourceName), "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  /** Write text or bytes, creating parent directories as needed. */
  async write(path: string, data: string | Uint8Array): Promise<void> {
    const dest = this.abs(path);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, data);
  }

  /** Copy a binary file (e.g. the special photo), creating parent dirs. */
  async copy(src: string, dest: string): Promise<void> {
    const to = this.abs(dest);
    await mkdir(dirname(to), { recursive: true });
    await copyFile(this.abs(src), to);
  }

  /** List the entry names directly under a directory. */
  async list(dir: string): Promise<string[]> {
    return readdir(this.abs(dir));
  }
}
