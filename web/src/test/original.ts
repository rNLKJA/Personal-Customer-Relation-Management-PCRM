import fs from "node:fs";
import path from "node:path";

/**
 * Loads functions straight out of the ORIGINAL 2021 source files in
 * `coursework/` so parity tests can run the team's code side by side with the
 * TypeScript ports. Functions are located by name, cut out with a small
 * brace matcher and evaluated with their free variables injected.
 */

export const COURSEWORK = path.resolve(__dirname, "../../../coursework");

export function originalSource(relative: string): string {
  return fs.readFileSync(path.join(COURSEWORK, relative), "utf8");
}

/** Source text of `function name(...) {...}` or `const name = (...) => {...}`. */
export function extractFunction(source: string, name: string): string {
  const patterns = [
    new RegExp(`^[ \\t]*(?:export\\s+)?function\\s+${name}\\s*\\(`, "m"),
    new RegExp(`^[ \\t]*(?:export\\s+)?const\\s+${name}\\s*=\\s*(?:async\\s*)?\\(`, "m"),
  ];
  const match = patterns.map((p) => p.exec(source)).find(Boolean);
  if (!match) throw new Error(`function ${name} not found in original source`);
  const start = match.index + match[0].length - match[0].trimStart().length;
  // Find the body's opening brace: the first "{" after the parameter list.
  let depth = 0;
  let i = source.indexOf("(", start);
  for (; i < source.length; i++) {
    if (source[i] === "(") depth++;
    else if (source[i] === ")") {
      depth--;
      if (depth === 0) break;
    }
  }
  const open = source.indexOf("{", i);
  depth = 0;
  let inString: string | null = null;
  for (let j = open; j < source.length; j++) {
    const ch = source[j];
    if (inString) {
      if (ch === "\\") j++;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") inString = ch;
    else if (ch === "/" && source[j + 1] === "/") j = source.indexOf("\n", j);
    else if (ch === "/" && source[j + 1] === "*") j = source.indexOf("*/", j) + 1;
    else if (ch === "/" && /[=(,:;!&|?{}[]\s*$/.test(source.slice(Math.max(0, j - 12), j))) {
      // regular-expression literal: skip to the closing slash (outside [...] classes)
      let inClass = false;
      for (j++; j < source.length; j++) {
        const c = source[j];
        if (c === "\\") j++;
        else if (c === "[") inClass = true;
        else if (c === "]") inClass = false;
        else if (c === "/" && !inClass) break;
      }
    } else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(start, j + 1).replace(/^\s*export\s+/, "");
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

/** Evaluate an original function with the given free variables in scope. */
export function loadOriginal<T>(
  relative: string,
  name: string,
  scope: Record<string, unknown> = {},
): T {
  const src = extractFunction(originalSource(relative), name);
  const keys = Object.keys(scope);
  const body = src.startsWith("function")
    ? `${src}\nreturn ${name};`
    : `return (${src.replace(/^const\s+\w+\s*=\s*/, "").replace(/;\s*$/, "")});`;
  return new Function(...keys, body)(...keys.map((k) => scope[k])) as T;
}

/** Run `fn` with the process time zone temporarily set (Node re-reads TZ). */
export function withTimeZone<T>(tz: string, fn: () => T): T {
  const previous = process.env.TZ;
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    process.env.TZ = previous;
  }
}
