// Plain filesystem I/O for the app — folds in the former @one-resume/fs
// FileSystemSource (read/write/copy/list) as direct fs calls. Paths are resolved
// by the caller; these just touch disk.

import {
  readFile,
  writeFile,
  mkdir,
  copyFile as fsCopyFile,
  readdir,
} from "node:fs/promises";
import { dirname } from "node:path";

/** Read UTF-8 text, or `null` when the file does not exist (ENOENT). */
export async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/** Read UTF-8 text; throw a clear error when the file does not resolve. */
export async function readTextRequired(path: string): Promise<string> {
  const text = await readText(path);
  if (text === null) throw new Error(`source not found: ${path}`);
  return text;
}

/** Read raw bytes (e.g. the special photo). */
export async function readBytes(path: string): Promise<Uint8Array> {
  return readFile(path);
}

/** Write text or bytes, creating parent directories as needed. */
export async function write(
  path: string,
  data: string | Uint8Array,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
}

/** Copy a binary file, creating parent dirs. */
export async function copyFile(src: string, dest: string): Promise<void> {
  await mkdir(dirname(dest), { recursive: true });
  await fsCopyFile(src, dest);
}

/** List entry names directly under a directory; `[]` when it does not exist. */
export async function listDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}
