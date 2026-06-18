// Tiny flag reader shared by the subcommands. Supports `--name value` and
// `--name=value`; `has` checks boolean flags.

export function getFlag(args: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = args.find((a) => a.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

export function has(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}
