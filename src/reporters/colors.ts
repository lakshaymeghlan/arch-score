/** Minimal zero-dependency ANSI styling, auto-disabled when not a TTY. */
const enabled =
  process.stdout.isTTY === true &&
  process.env.NO_COLOR === undefined &&
  process.env.TERM !== "dumb";

function wrap(open: number, close: number) {
  return (s: string) => (enabled ? `[${open}m${s}[${close}m` : s);
}

export const c = {
  enabled,
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  magenta: wrap(35, 39),
  cyan: wrap(36, 39),
  gray: wrap(90, 39),
};

/** Color a 0-100 score by band. */
export function scoreColor(n: number): (s: string) => string {
  if (n >= 80) return c.green;
  if (n >= 60) return c.yellow;
  return c.red;
}
