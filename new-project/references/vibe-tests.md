# Vibe Project: Unit tests (Vitest in workerd) and browser tests (Playwright + axe)

Use these exact file contents when scaffolding a `--vibe` project. Paths are
relative to `$TARGET_DIR`. Replace every placeholder (the table is in
SKILL.md's Pre-flight) before writing; `{{THEME_SCRIPT_HASH}}` is filled in
after `index.html` is written (SKILL.md, Step V3). These files were generated
from a scaffold that passed every check in CI (`scripts/vibe_refs.py`); do not
"improve" them while scaffolding.

---

## `test/tsconfig.json`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "../node_modules/.tmp/tsconfig.test.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": {
      "#shared/*": ["../shared/*"]
    },
    "types": ["@cloudflare/vitest-plugin/types"]
  },
  "include": [
    "./**/*.ts",
    "../worker",
    "../shared",
    "../worker-configuration.d.ts"
  ]
}
```

---

## `test/raw.d.ts`

```ts
/** Vite's `?raw` imports: the file's text. */
declare module '*?raw' {
  const text: string;
  export default text;
}

/** Vite's `import.meta.glob`, as the tests use it: files' text by path. */
interface ImportMeta {
  glob<T>(
    pattern: string | string[],
    options: { query: '?raw'; import: 'default'; eager: true },
  ): Record<string, T>;
  /** Without options: each file's path, nothing loaded until asked. */
  glob(pattern: string | string[]): Record<string, () => Promise<unknown>>;
}

/** Vite's `?inline` asset imports: the file as a data: URL. */
declare module '*?inline' {
  const url: string;
  export default url;
}
```

---

## `test/api.test.ts`

```ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { Health } from '#shared/api';
import { COMMIT, VERSION } from '#shared/version';
import { handle } from '../worker/index';

const get = (path: string, init?: RequestInit) =>
  handle(new Request(`http://app.test${path}`, init), env);

describe('the API', () => {
  it('says which build is running', async () => {
    const response = await get('/api/health');
    expect(response.status).toBe(200);
    const body = (await response.json()) as Health;
    expect(body).toEqual({ ok: true, version: VERSION, commit: COMMIT });
    expect(body.version).not.toBe('dev');
  });

  it('answers an unknown path with a JSON 404', async () => {
    const response = await get('/api/nope');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });

  it('refuses another method, and says which one it takes', async () => {
    const response = await get('/api/health', { method: 'DELETE' });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
  });

  it('uses cf-ray as the request id, and makes one up without it', async () => {
    const ray = await get('/api/health', {
      headers: { 'cf-ray': 'abc123-IAD' },
    });
    expect(ray.headers.get('x-request-id')).toBe('abc123-IAD');
    const forged = await get('/api/health', {
      headers: { 'cf-ray': '<script>' },
    });
    expect(forged.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });
});
```

---

## `test/headers.test.ts`

```ts
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import headers from '../public/_headers?raw';
import { handle } from '../worker/index';

/** The header lines under one path rule of public/_headers, by name. */
function rule(path: string): Map<string, string> {
  const out = new Map<string, string>();
  let inside = false;
  for (const line of headers.split('\n')) {
    if (line === '' || line.startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      inside = line.trim() === path;
      continue;
    }
    if (!inside) continue;
    const at = line.indexOf(':');
    out.set(line.slice(0, at).trim().toLowerCase(), line.slice(at + 1).trim());
  }
  return out;
}

const HSTS = 'max-age=31536000; includeSubDomains';

/** The value of one header in public/_headers (named once in the file). */
function header(name: string): string {
  const lines = headers
    .split('\n')
    .filter((l) => l.trim().toLowerCase().startsWith(`${name.toLowerCase()}:`));
  expect(lines, `${name} in public/_headers`).toHaveLength(1);
  const line = lines[0] ?? '';
  return line.slice(line.indexOf(':') + 1).trim();
}

function directive(csp: string, name: string): string[] {
  const found = csp
    .split(';')
    .map((d) => d.trim().split(/\s+/))
    .find(([key]) => key === name);
  expect(found, `${name} in the CSP`).toBeDefined();
  return found?.slice(1) ?? [];
}

/** The body of every inline `<script>` (no `src`), parsed rather than matched. */
async function inlineScripts(source: string): Promise<string[]> {
  const bodies: string[] = [];
  await new HTMLRewriter()
    .on('script:not([src])', {
      element() {
        bodies.push('');
      },
      text(chunk) {
        bodies[bodies.length - 1] += chunk.text;
      },
    })
    .transform(new Response(source))
    .text();
  return bodies;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

describe('static asset headers', () => {
  it('is a well-formed _headers file', () => {
    // Comments, blank lines, path rules, and `Name: value` lines. Anything
    // else (a stray conflict marker, say) ships to every visitor.
    for (const line of headers.split('\n')) {
      if (line === '' || line.startsWith('#')) continue;
      expect(line, line).toMatch(/^(\/\S*|\s+[A-Za-z-]+: \S.*)$/);
    }
  });

  const csp = header('Content-Security-Policy');

  it('allows every inline script in index.html by hash, and nothing else inline', async () => {
    const inline = await inlineScripts(html);
    expect(inline.length).toBeGreaterThan(0);
    const scriptSrc = directive(csp, 'script-src');
    for (const body of inline) {
      expect(scriptSrc, 'put this hash in public/_headers').toContain(
        `'sha256-${await sha256(body)}'`,
      );
    }
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it('cannot be framed, sniffed or pointed elsewhere', () => {
    expect(directive(csp, 'default-src')).toEqual(["'self'"]);
    expect(directive(csp, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(csp, 'object-src')).toEqual(["'none'"]);
    expect(directive(csp, 'base-uri')).toEqual(["'none'"]);
    expect(directive(csp, 'form-action')).toEqual(["'self'"]);
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('X-Frame-Options')).toBe('DENY');
    expect(header('Referrer-Policy')).toBe('same-origin');
    expect(header('Permissions-Policy')).toContain('camera=()');
  });

  it('sends HSTS on every asset', () => {
    expect(rule('/*').get('strict-transport-security')).toBe(HSTS);
  });

  it('keeps hashed /assets/* for a year, and only those', () => {
    expect(rule('/assets/*').get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    );
    // index.html and the icons are revalidated.
    expect(rule('/*').has('cache-control')).toBe(false);
  });

  it('loads and connects to nothing on another origin', () => {
    for (const name of [
      'script-src',
      'font-src',
      'img-src',
      'worker-src',
      'connect-src',
    ]) {
      for (const source of directive(csp, name)) {
        expect(source, `${name} ${source}`).not.toMatch(/^https?:|^\*/);
      }
    }
  });
});

describe('Worker response headers', () => {
  it('sends them on JSON, error and refusal responses', async () => {
    const responses = await Promise.all([
      handle(new Request('http://app.test/api/health'), env),
      handle(new Request('http://app.test/api/nope'), env),
      handle(
        new Request('http://app.test/api/health', { method: 'POST' }),
        env,
      ),
    ]);
    for (const response of responses) {
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('strict-transport-security')).toBe(HSTS);
      expect(response.headers.get('x-request-id')).toBeTruthy();
      expect(response.headers.get('content-security-policy')).toContain(
        "frame-ancestors 'none'",
      );
    }
  });
});
```

---

## `test/themes.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import css from '../src/index.css?raw';
import { THEMES as THEME_OPTIONS } from '../src/lib/themes';

/**
 * Every theme's tokens against WCAG AA: 4.5:1 for text on the surfaces it
 * sits on, 3:1 for the focus ring against the page and cards. Reads the
 * token blocks straight out of src/index.css.
 */

type Tokens = Record<string, string>;

function block(selector: string): Tokens {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) throw new Error(`No block for ${selector}`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const tokens: Tokens = {};
  for (const [, name, value] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[name] = value.trim();
  }
  return tokens;
}

const light = block(':root');
const dark = { ...light, ...block('.dark') };
const THEMES: Record<string, Tokens> = {
  light,
  dark,
};

type Rgb = [r: number, g: number, b: number];

/** oklch(L C H [/ A]) → gamma-encoded sRGB (0–1) and its alpha. */
function parse(value: string): { rgb: Rgb; alpha: number } {
  const m = value.match(
    /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)(%?)\s*)?\)$/,
  );
  if (!m) throw new Error(`Not an oklch() color: ${value}`);
  const [L, C, H] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const alpha = m[4] === undefined ? 1 : Number(m[4]) / (m[5] ? 100 : 1);
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  const linear: Rgb = [
    clamp(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s),
  ];
  const encode = (c: number) =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return { rgb: linear.map(encode) as Rgb, alpha };
}

function luminance([r, g, b]: Rgb): number {
  const decode = (c: number) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * decode(r) + 0.7152 * decode(g) + 0.0722 * decode(b);
}

/**
 * A token as it is drawn on `under`: `ring/50` is the ring at half its
 * alpha, and anything translucent is blended over the surface below, the
 * way the browser composites it (in gamma-encoded sRGB).
 */
function paint(tokens: Tokens, name: string, under?: Rgb): Rgb {
  const [token = '', percent] = name.split('/');
  const { rgb, alpha } = parse(tokens[token] ?? '');
  const a = alpha * (percent ? Number(percent) / 100 : 1);
  if (a >= 1) return rgb;
  if (!under) throw new Error(`${name} is translucent: give it a surface`);
  return rgb.map((c, i) => c * a + (under[i] ?? 0) * (1 - a)) as Rgb;
}

/** Contrast of `fg` drawn on `bg`, which is drawn on the page. */
function contrast(tokens: Tokens, fg: string, bg: string): number {
  const page = paint(tokens, 'background');
  const surface = paint(tokens, bg, page);
  const [x, y] = [
    luminance(paint(tokens, fg, surface)),
    luminance(surface),
  ].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const TEXT: [fg: string, bg: string][] = [
  ['foreground', 'background'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'muted'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  ['destructive', 'background'],
  ['destructive', 'card'],
  // The semantic pairs: used as text (due, done) and as a fill with its
  // foreground on top (badges).
  ['warn', 'background'],
  ['warn', 'card'],
  ['warn-foreground', 'warn'],
  ['ok', 'background'],
  ['ok', 'card'],
  ['ok-foreground', 'ok'],
  // Hovered rows and menu items keep their muted text readable.
  ['muted-foreground', 'accent'],
  ['muted-foreground', 'popover'],
];

const NON_TEXT: [fg: string, bg: string][] = [
  // The focus ring, as drawn: the app's `outline-ring/50` and the stock
  // components' `ring-ring/50`, and full strength on inputs (`border-ring`).
  ['ring', 'background'],
  ['ring', 'card'],
  ['ring/50', 'background'],
  ['ring/50', 'card'],
  ['ring/50', 'popover'],
  ['ring/50', 'accent'],
  // A checkbox's or a field's edge is what shows it is there (WCAG 1.4.11).
  ['input', 'background'],
  ['input', 'card'],
  ['input', 'popover'],
];

describe.each(Object.entries(THEMES))('theme %s', (_, tokens) => {
  it.each(TEXT)('%s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrast(tokens, fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT)('%s on %s is at least 3:1', (fg, bg) => {
    expect(contrast(tokens, fg, bg)).toBeGreaterThanOrEqual(3);
  });
});

/**
 * `.dark` layers on `:root`; a token it forgets silently keeps the light
 * value, so it has to define every color token :root does (the radius is
 * the same in both).
 */
const REQUIRED = Object.keys(light).filter((name) => name !== 'radius');

describe('token coverage', () => {
  it('requires the semantic tokens', () => {
    expect(REQUIRED).toEqual(
      expect.arrayContaining([
        'warn',
        'warn-foreground',
        'ok',
        'ok-foreground',
      ]),
    );
  });

  it('.dark defines every token', () => {
    const own = Object.keys(block('.dark'));
    expect(REQUIRED.filter((name) => !own.includes(name))).toEqual([]);
  });
});

describe('theme ids', () => {
  it('lists System, Light and Dark', () => {
    expect(THEME_OPTIONS.map((t) => t.id)).toEqual(['system', 'light', 'dark']);
  });
});

describe('Dark is the neutral counterpart of Light', () => {
  it('has no tint on its surfaces and text', () => {
    for (const token of [
      'background',
      'foreground',
      'card',
      'popover',
      'muted',
      'border',
      'primary',
    ]) {
      const value = dark[token] ?? '';
      // oklch(L C H [/ alpha]): chroma 0 means gray.
      expect(value, token).toMatch(/^oklch\(\s*[\d.]+\s+0(\s|\))/);
    }
  });
});
```

---

## `test/motion-tokens.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import css from '../src/index.css?raw';
import { DURATION, EASE } from '../src/lib/motion-tokens';

/**
 * Motion has one set of tokens. CSS reads them as `var(--duration-*)` and
 * `var(--ease-*)`; script (WAAPI, timers) reads src/lib/motion-tokens.ts.
 * The two must say the same thing, and no `.animate()` call may write its
 * own duration or easing.
 */

// Read at build time: the tests run in workerd, which has no file system.
const SOURCES = import.meta.glob<string>(
  ['../src/**/*.{ts,tsx}', '!../src/components/ui/**'],
  { query: '?raw', import: 'default', eager: true },
);

function rootTokens(): Record<string, string> {
  const start = css.indexOf('--duration-fast');
  const open = css.lastIndexOf('{', start);
  const body = css.slice(open + 1, css.indexOf('}', start));
  const tokens: Record<string, string> = {};
  for (const [, name = '', value = ''] of body.matchAll(
    /--([\w-]+):\s*([^;]+);/g,
  )) {
    tokens[name] = value.trim();
  }
  return tokens;
}

describe('motion tokens', () => {
  const tokens = rootTokens();

  it('script and CSS give each duration the same value', () => {
    for (const [name, ms] of Object.entries(DURATION)) {
      expect(tokens[`duration-${name}`], `--duration-${name}`).toBe(`${ms}ms`);
    }
    const css = Object.keys(tokens).filter((t) => t.startsWith('duration-'));
    expect(css.sort()).toEqual(
      Object.keys(DURATION)
        .map((n) => `duration-${n}`)
        .sort(),
    );
  });

  it('script and CSS give each easing the same curve', () => {
    for (const [name, curve] of Object.entries(EASE)) {
      expect(tokens[`ease-${name}`], `--ease-${name}`).toBe(curve);
    }
  });

  it('no animation in script writes a literal duration or easing', () => {
    expect(Object.keys(SOURCES)).toContain('../src/lib/motion.ts');
    const offenders: string[] = [];
    for (const [file, text] of Object.entries(SOURCES)) {
      if (file.endsWith('/motion-tokens.ts')) continue;
      text.split('\n').forEach((line, i) => {
        const where = `${file.replace(/^\.\.\//, '')}:${i + 1}`;
        if (/cubic-bezier\(/.test(line)) offenders.push(`${where} ${line}`);
        if (/\bduration:\s*\d/.test(line)) offenders.push(`${where} ${line}`);
        if (/\beasing:\s*['"]/.test(line)) offenders.push(`${where} ${line}`);
      });
    }
    expect(offenders, 'use DURATION and EASE from @/lib/motion-tokens').toEqual(
      [],
    );
  });
});
```

---

## `test/workflows.test.ts`

```ts
import { describe, expect, it } from 'vitest';

/*
 * Every action the workflows use is pinned to a full commit SHA. A tag such
 * as `@v4` can be moved to different code by whoever controls the action's
 * repository; a SHA cannot. The trailing `# vX.Y.Z` comment is what
 * Dependabot reads and rewrites, so an update stays one reviewable pull
 * request that changes the SHA and the comment together.
 */

// Read at build time: the tests run in workerd, which has no file system.
const WORKFLOWS = import.meta.glob<string>(
  '../.github/workflows/*.{yml,yaml}',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

const PACKAGE = JSON.parse(
  Object.values(
    import.meta.glob<string>('../package.json', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  )[0] ?? '{}',
) as {
  packageManager?: string;
  devDependencies?: Record<string, string>;
};

const PINNED = /^[\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/;

function usesLines(): { file: string; line: number; ref: string }[] {
  return Object.entries(WORKFLOWS).flatMap(([file, text]) =>
    text.split('\n').flatMap((line, i) => {
      const match = /^\s*(?:-\s+)?uses:\s*(.+?)\s*$/.exec(line);
      return match?.[1]
        ? [{ file: file.replace(/^\.\.\//, ''), line: i + 1, ref: match[1] }]
        : [];
    }),
  );
}

describe('workflows', () => {
  it('are found, and use actions', () => {
    expect(Object.keys(WORKFLOWS)).toEqual(
      expect.arrayContaining([
        '../.github/workflows/ci.yml',
        '../.github/workflows/codeql.yml',
        '../.github/workflows/deploy.yml',
        '../.github/workflows/preview.yml',
        '../.github/workflows/release.yml',
      ]),
    );
    expect(usesLines().length).toBeGreaterThan(0);
  });

  it('pin every action to a commit SHA with its version in a comment', () => {
    const unpinned = usesLines()
      .filter(({ ref }) => !ref.startsWith('./') && !PINNED.test(ref))
      .map(({ file, line, ref }) => `${file}:${line} ${ref}`);
    expect(
      unpinned,
      'pin each to `owner/repo@<40-hex sha> # vX.Y.Z` (resolve the tag with `gh api repos/<owner>/<repo>/commits/<tag> --jq .sha`)',
    ).toEqual([]);
  });

  it('pin one action to one version everywhere it is used', () => {
    const pins = new Map<string, Set<string>>();
    for (const { ref } of usesLines()) {
      // `github/codeql-action/init` and `/analyze` are one action.
      const [path = '', pin] = ref.split('@');
      if (!pin) continue;
      const action = path.split('/').slice(0, 2).join('/');
      pins.set(action, (pins.get(action) ?? new Set()).add(pin));
    }
    const split = [...pins].filter(([, p]) => p.size > 1).map(([a]) => a);
    expect(split, 'every use of an action carries the same pin').toEqual([]);
  });

  it('use the one bun version package.json names', () => {
    // `packageManager` is the version: setup-bun reads it through
    // `bun-version-file`, and the e2e container installs exactly it.
    expect(PACKAGE.packageManager).toMatch(/^bun@\d+\.\d+\.\d+$/);
    const offenders: string[] = [];
    for (const [file, text] of Object.entries(WORKFLOWS)) {
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        const where = `${file.replace(/^\.\.\//, '')}:${i + 1}`;
        if (/uses:\s*oven-sh\/setup-bun@/.test(line)) {
          // The step's own `with:` block: the lines indented past `uses:`.
          const indent = line.search(/\S/) + 2;
          const block: string[] = [];
          for (const next of lines.slice(i + 1)) {
            if (next.trim() && next.search(/\S/) < indent) break;
            block.push(next);
          }
          const step = block.join('\n');
          if (
            !/^\s*bun-version-file:\s*package\.json\s*$/m.test(step) ||
            /^\s*bun-version:/m.test(step)
          ) {
            offenders.push(`${where} setup-bun without bun-version-file`);
          }
        }
        if (
          /install\s+(?:--global|-g)\s+["']?bun\b/.test(line) &&
          !line.includes('packageManager')
        ) {
          offenders.push(`${where} installs bun without packageManager`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('pin the Playwright image by digest, at the @playwright/test version', () => {
    const images = Object.values(WORKFLOWS).flatMap((text) =>
      [...text.matchAll(/^\s*image:\s*(.+?)\s*$/gm)].map((m) => m[1] ?? ''),
    );
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      // A tag can be pushed again; a digest cannot. The comment keeps the
      // tag, so a reader (and the check below) knows which one it is.
      expect(image).toMatch(/^[\w./-]+@sha256:[0-9a-f]{64} # \S+$/);
    }
    const playwright = images.find((i) =>
      i.startsWith('mcr.microsoft.com/playwright@'),
    );
    expect(
      playwright,
      'the e2e job runs in the Playwright image',
    ).toBeDefined();
    const version = PACKAGE.devDependencies?.['@playwright/test'];
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(playwright).toMatch(new RegExp(` # v${version}-\\w+$`));
  });

  it('never use pull_request_target', () => {
    // It runs fork PRs with a write token and the repository's secrets.
    const offenders = Object.entries(WORKFLOWS)
      .filter(([, text]) => /^\s*pull_request_target\s*:/m.test(text))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });
});

describe('releases', () => {
  const changelog =
    Object.values(
      import.meta.glob<string>('../CHANGELOG.md', {
        query: '?raw',
        import: 'default',
        eager: true,
      }),
    )[0] ?? '';

  it('keep an Unreleased section on top for the next one', () => {
    const headings = changelog.match(/^## .*$/gm) ?? [];
    expect(headings[0]).toBe('## [Unreleased]');
  });

  it('head every release `## [x.y.z] — YYYY-MM-DD`, as release.yml reads it', () => {
    const releases = (changelog.match(/^## .*$/gm) ?? []).slice(1);
    for (const heading of releases) {
      expect(heading).toMatch(/^## \[\d+\.\d+\.\d+\] — \d{4}-\d{2}-\d{2}$/);
    }
  });
});
```

---

## `e2e/tsconfig.json`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "../node_modules/.tmp/tsconfig.e2e.tsbuildinfo",
    "target": "ES2023",
    // DOM for the callbacks that run in the page (`page.evaluate`).
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["node"]
  },
  "include": ["./**/*.ts", "../playwright.config.ts", "../test/fixtures/*.json"]
}
```

---

## `e2e/fixtures.ts`

```ts
import AxeBuilder from '@axe-core/playwright';
import {
  type BrowserContext,
  test as base,
  expect,
  type Page,
} from '@playwright/test';
import type { ThemeId } from '../src/lib/themes';

export { expect };

/**
 * Nothing leaves localhost: fonts are bundled and the app talks only to its
 * own origin, so any other request is a bug (and is blocked here).
 */
async function offline(context: BrowserContext) {
  await context.route(
    (url) => url.hostname !== 'localhost',
    (route) => route.abort('blockedbyclient'),
  );
}

/** Save `theme` in this context's storage before any page loads. */
async function useTheme(context: BrowserContext, theme: ThemeId | null) {
  if (theme !== null) {
    await context.addInitScript((id) => {
      localStorage.setItem('{{PROJECT_NAME}}:theme', id);
    }, theme);
  }
}

interface Options {
  /** The theme every context starts in; null leaves it on System. */
  theme: ThemeId | null;
}

export const test = base.extend<Options>({
  theme: [null, { option: true }],
  context: async ({ context, theme }, use) => {
    await offline(context);
    await useTheme(context, theme);
    await use(context);
  },
});

/** Whether this test runs at phone width (below the `desk` breakpoint). */
export function isMobile(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1280) < 820;
}

/** Open the preferences menu (Theme, Motion). */
export async function openPreferences(page: Page) {
  await page.getByRole('button', { name: 'Preferences' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
}

/** No sideways scrolling (WCAG 1.4.10 Reflow). */
export async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Every finite animation has finished (entrances, view transitions). */
export async function settle(page: Page) {
  await expect(page.locator('html')).not.toHaveAttribute('data-vt');
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}

/**
 * axe-core over the whole page against WCAG 2.2 A and AA, open menus and
 * dialogs and the page under them alike. Soft, so one run lists every
 * failure, not just the first.
 */
export async function expectAccessible(page: Page) {
  // Let entrances finish so contrast is measured at rest, and start from
  // the top: a target scrolled under the sticky header reads as obscured.
  await settle(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => `${n.target.join(' ')}: ${n.html.slice(0, 160)}`),
  }));
  expect.soft(summary).toEqual([]);
}
```

---

## `e2e/app.spec.ts`

```ts
import { expect, isMobile, openPreferences, test } from './fixtures';

/**
 * The shell: the Worker answers, links move between pages and take focus
 * with them, a theme sticks, and an unknown address says so. A new flow
 * worth keeping gets its own spec beside this one.
 */

test('the home page reaches the Worker', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Worker is up');
});

test('the Worker being unreachable reads as such', async ({ page }) => {
  await page.route('**/api/health', (route) => route.abort('failed'));
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText(
    'Could not reach {{PROJECT_TITLE}}. Check the connection and try again.',
  );
});

test('a link moves to its page and focus moves with it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Help' }).click();
  await expect(page).toHaveURL(/\/help$/);
  await expect(page).toHaveTitle('Help · {{PROJECT_TITLE}}');
  await expect(page.getByRole('main')).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('{{PROJECT_TITLE}}');
});

test('a theme picked in Preferences sticks', async ({ page }) => {
  await page.goto('/');
  await openPreferences(page);
  await page.getByRole('menuitemradio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
});

test('an unknown address is Not found, with a way home', async ({ page }) => {
  await page.goto('/no/such/page');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Not found');
  await page.getByRole('link', { name: 'Go home' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('Help opens at a section from its link', async ({ page }) => {
  test.skip(isMobile(page), 'Scrolling is the same on both.');
  await page.goto('/help#about');
  await expect(
    page.getByRole('heading', { name: 'About this build' }),
  ).toBeInViewport();
});
```

---

## `e2e/a11y.spec.ts`

```ts
import type { Page } from '@playwright/test';
import { THEMES, type ThemeOption } from '../src/lib/themes';
import {
  expect,
  expectAccessible,
  isMobile,
  openPreferences,
  test,
} from './fixtures';

/**
 * Every theme a person can pick, axe-checked on its own: a token pair that
 * passes in test/themes.test.ts can still fail once composited (opacity,
 * translucent backgrounds). System is Light or Dark, both covered.
 *
 * Every route (ROUTES), then the states that only show after a click:
 * themes × the desktop and phone projects. A new route, dialog or menu
 * adds itself here.
 */
const CHECKED = THEMES.filter((t) => t.id !== 'system');
const ROUTES = [
  { path: '/', heading: '{{PROJECT_TITLE}}' },
  { path: '/help', heading: 'Help' },
  { path: '/nope', heading: 'Not found' },
];

/** The theme really applied, so a silent fallback to Light cannot pass. */
async function expectTheme(page: Page, theme: ThemeOption) {
  const html = page.locator('html');
  if (theme.base === 'dark') {
    await expect(html).toHaveClass(/\bdark\b/);
  } else {
    await expect(html).not.toHaveClass(/\bdark\b/);
  }
}

// Measured at rest: no entrance half-faded when contrast is checked.
test.use({ reducedMotion: 'reduce' });

for (const theme of CHECKED) {
  test.describe(`${theme.label} theme`, () => {
    test.use({ theme: theme.id });

    for (const route of ROUTES) {
      test(`${route.path}`, async ({ page }) => {
        await page.goto(route.path);
        await expectTheme(page, theme);
        await expect(
          page.getByRole('heading', { level: 1, name: route.heading }),
        ).toBeVisible();
        await expectAccessible(page);
      });
    }

    test('with Preferences open', async ({ page }) => {
      await page.goto('/');
      await openPreferences(page);
      await expectAccessible(page);
    });
  });
}

test('forced colors keep the current page visible', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/help');
  const current = page.locator('[aria-current="page"]');
  expect(
    await current.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).toBe('solid');
  // No axe here: in forced colors the system theme picks every color, so
  // its contrast rule measures the authored ones and means nothing.
});

test('the skip link reaches the main content', async ({ page }) => {
  test.skip(isMobile(page), 'Keyboard navigation is a desktop concern.');
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});
```

---

## `e2e/reflow.spec.ts`

```ts
import { expect, expectNoSidewaysScroll, test } from './fixtures';

/**
 * WCAG 1.4.10 Reflow and the phone layout. 320px is a 1280px window at
 * 400% zoom and the narrowest phone; 1280px is a laptop.
 */
const ROUTES = ['/', '/help', '/nope'];

for (const width of [320, 1280]) {
  test.describe(`at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const path of ROUTES) {
      test(`${path} needs no sideways scrolling`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoSidewaysScroll(page);
        await expect(
          page.getByRole('button', { name: 'Preferences' }),
        ).toBeInViewport({ ratio: 1 });
      });
    }
  });
}

test.describe('on a phone', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('header controls are at least 44px', async ({ page }) => {
    await page.goto('/');
    const banner = page.getByRole('banner');
    for (const control of [
      banner.getByRole('link', { name: '{{PROJECT_TITLE}}' }),
      banner.getByRole('link', { name: 'Help' }),
      banner.getByRole('button', { name: 'Preferences' }),
    ]) {
      const box = await control.boundingBox();
      expect(box?.height ?? 0, String(control)).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0, String(control)).toBeGreaterThanOrEqual(44);
    }
  });

  test('the preferences menu fits on screen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Preferences' }).click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu).toBeInViewport({ ratio: 1 });
    await expectNoSidewaysScroll(page);
  });
});
```

---

## `e2e/motion.spec.ts`

```ts
import type { Page } from '@playwright/test';
import { expect, openPreferences, settle, test } from './fixtures';

/**
 * Run `act` in the page, then watch every frame for the next second and
 * report each animation seen running (CSS, WAAPI and view transition
 * pseudo-elements all show up in `document.getAnimations()`).
 */
async function animationsDuring(
  page: Page,
  act: 'route' | 'theme',
): Promise<string[]> {
  await settle(page);
  return page.evaluate(
    (kind) =>
      new Promise<string[]>((resolve) => {
        const seen = new Set<string>();
        const label = (a: Animation) => {
          const effect = a.effect as KeyframeEffect | null;
          const target = effect?.target as HTMLElement | null;
          const name =
            a instanceof CSSAnimation
              ? a.animationName
              : a instanceof CSSTransition
                ? `transition:${a.transitionProperty}`
                : a.id || 'animation';
          return `${name} on ${target?.tagName.toLowerCase() ?? '?'}${effect?.pseudoElement ?? ''}`;
        };
        const end = performance.now() + 1000;
        const tick = () => {
          for (const a of document.getAnimations()) {
            if (a.playState === 'running') seen.add(label(a));
          }
          if (performance.now() < end) requestAnimationFrame(tick);
          else resolve([...seen]);
        };
        if (kind === 'route') {
          (document.querySelector('a[href="/help"]') as HTMLElement).click();
        } else {
          const item = [
            ...document.querySelectorAll('[role="menuitemradio"]'),
          ].find(
            (el) =>
              el.getAttribute('aria-checked') !== 'true' &&
              el.textContent?.trim() !== 'System',
          ) as HTMLElement;
          item.click();
        }
        tick();
      }),
    act,
  );
}

test.describe('with prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  test('nothing animates through a route change', async ({ page }) => {
    await page.goto('/');
    expect(await animationsDuring(page, 'route')).toEqual([]);
    await expect(page.getByRole('heading', { name: 'Help' })).toBeVisible();
  });

  test('nothing animates through a theme change', async ({ page }) => {
    await page.goto('/');
    await openPreferences(page);
    expect(await animationsDuring(page, 'theme')).toEqual([]);
  });

  test('the Motion switch says the system turned it off', async ({ page }) => {
    await page.goto('/');
    await openPreferences(page);
    const motion = page.getByRole('menuitemcheckbox', { name: /Motion/ });
    await expect(motion).toContainText('off by your OS');
    await expect(motion).toHaveAttribute('aria-disabled', 'true');
  });
});

test.describe('with the Motion preference off', () => {
  test('nothing animates through a route change', async ({ page }) => {
    await page.goto('/');
    await openPreferences(page);
    await page.getByRole('menuitemcheckbox', { name: 'Motion' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await page.keyboard.press('Escape');
    expect(await animationsDuring(page, 'route')).toEqual([]);
  });

  test('stays off after a reload', async ({ page }) => {
    await page.goto('/');
    await openPreferences(page);
    await page.getByRole('menuitemcheckbox', { name: 'Motion' }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  });
});

test('with motion on, a route change is a page transition', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'View Transitions are Chromium-first.');
  await page.goto('/');
  const seen = await animationsDuring(page, 'route');
  expect(seen.some((a) => a.includes('::view-transition-new(page)'))).toBe(
    true,
  );
});
```
