import type { ProjectSpec } from "../schema/project-spec";

export type StackDraft = NonNullable<ProjectSpec["stack"]>;

type StackSlot = "frontend" | "backend" | "database" | "authentication" | "hosting";

interface TechAlias {
  readonly slot: StackSlot | "additional";
  readonly name: string;
  readonly pattern: RegExp;
}

const TECH: readonly TechAlias[] = [
  { slot: "frontend", name: "Next.js", pattern: /\bnext(?:\s*\.?js)?\b/i },
  { slot: "frontend", name: "Nuxt", pattern: /\bnuxt(?:\s*\.?js)?\b/i },
  { slot: "frontend", name: "SvelteKit", pattern: /\bsvelte\s*kit\b/i },
  { slot: "frontend", name: "React Native", pattern: /\breact\s*native\b/i },
  { slot: "frontend", name: "React", pattern: /\breact(?:\s*\.?js)?\b/i },
  { slot: "frontend", name: "Vue", pattern: /\bvue(?:\s*\.?js)?\b/i },
  { slot: "frontend", name: "Svelte", pattern: /\bsvelte\b/i },
  { slot: "frontend", name: "Angular", pattern: /\bangular\b/i },
  { slot: "frontend", name: "Flutter", pattern: /\bflutter\b/i },
  { slot: "backend", name: "Go", pattern: /\bgo(?:lang)?\b/i },
  { slot: "backend", name: "NestJS", pattern: /\bnest(?:\s*\.?js)?\b/i },
  { slot: "backend", name: "Express", pattern: /\bexpress(?:\s*\.?js)?\b/i },
  { slot: "backend", name: "Node.js", pattern: /\bnode(?:\s*\.?js)?\b/i },
  { slot: "backend", name: "FastAPI", pattern: /\bfast\s*api\b/i },
  { slot: "backend", name: "Django", pattern: /\bdjango\b/i },
  { slot: "backend", name: "Flask", pattern: /\bflask\b/i },
  { slot: "backend", name: "Python", pattern: /\bpython\b/i },
  { slot: "backend", name: "Laravel", pattern: /\blaravel\b/i },
  { slot: "backend", name: "Rails", pattern: /\b(?:ruby\s*on\s*)?rails\b/i },
  { slot: "backend", name: "Spring", pattern: /\bspring\b/i },
  { slot: "backend", name: "Java", pattern: /\bjava\b/i },
  { slot: "backend", name: "Rust", pattern: /\brust\b/i },
  { slot: "backend", name: "PHP", pattern: /\bphp\b/i },
  { slot: "database", name: "Postgres", pattern: /\b(?:postgres(?:ql)?|postgre|pg)\b/i },
  { slot: "database", name: "MySQL", pattern: /\bmy\s*sql\b/i },
  { slot: "database", name: "MongoDB", pattern: /\bmongo(?:db)?\b/i },
  { slot: "database", name: "SQLite", pattern: /\bsqlite\b/i },
  { slot: "database", name: "Supabase", pattern: /\bsupabase\b/i },
  { slot: "database", name: "Firebase", pattern: /\bfirebase\b/i },
  { slot: "authentication", name: "Clerk", pattern: /\bclerk\b/i },
  { slot: "authentication", name: "Auth.js", pattern: /\b(?:next\s*auth|auth\.js)\b/i },
  { slot: "authentication", name: "Auth0", pattern: /\bauth0\b/i },
  { slot: "authentication", name: "Firebase Auth", pattern: /\bfirebase\s*auth\b/i },
  { slot: "hosting", name: "Vercel", pattern: /\bvercel\b/i },
  { slot: "hosting", name: "Netlify", pattern: /\bnetlify\b/i },
  { slot: "hosting", name: "Railway", pattern: /\brailway\b/i },
  { slot: "hosting", name: "Render", pattern: /\brender\b/i },
  { slot: "hosting", name: "Fly.io", pattern: /\bfly(?:\.io)?\b/i },
  { slot: "hosting", name: "AWS", pattern: /\baws\b/i },
  { slot: "additional", name: "TypeScript", pattern: /\b(?:type\s*script|ts)\b/i },
  { slot: "additional", name: "Tailwind CSS", pattern: /\btailwind(?:\s*css)?\b/i },
  { slot: "additional", name: "Prisma", pattern: /\bprisma\b/i },
  { slot: "additional", name: "Redis", pattern: /\bredis\b/i },
  { slot: "additional", name: "Docker", pattern: /\bdocker\b/i },
];

const ROLE_CUES: readonly { slot: StackSlot; pattern: RegExp }[] = [
  {
    slot: "frontend",
    pattern: /\b(?:fe|front\s*-?end|frontend|ui|client|tampilan)\b/i,
  },
  {
    slot: "backend",
    pattern: /\b(?:be|back\s*-?end|backend|server|api)\b/i,
  },
  {
    slot: "database",
    pattern: /\b(?:db|database|basis\s*data|databasenya)\b/i,
  },
  {
    slot: "authentication",
    pattern: /\b(?:auth|authentication|login|autentikasi)\b/i,
  },
  {
    slot: "hosting",
    pattern: /\b(?:host(?:ing)?|deploy(?:ment)?)\b/i,
  },
];

export function looksLikeStackDump(stack: StackDraft | undefined): boolean {
  return (stack?.additional ?? []).some((item) => isSpokenStackDump(item));
}

export function hasStructuredStack(stack: StackDraft | undefined): boolean {
  if (!stack) {
    return false;
  }

  return Boolean(
    stack.frontend ||
      stack.backend ||
      stack.database ||
      stack.authentication ||
      stack.hosting,
  );
}

export function parseStackAnswer(answer: string): StackDraft {
  const text = answer.trim();
  if (!text) {
    return {};
  }

  const found = findMentions(text);
  if (found.length === 0) {
    return {};
  }

  const next: StackDraft = {};
  const extras: string[] = [];

  for (const mention of found) {
    const slot = mention.role ?? (mention.slot === "additional" ? undefined : mention.slot);
    if (mention.slot === "additional" && !slot) {
      extras.push(mention.name);
      continue;
    }

    const target = slot ?? "additional";
    if (target === "additional") {
      extras.push(mention.name);
      continue;
    }

    if (!next[target]) {
      next[target] = mention.name;
    }
  }

  if (next.frontend === "React" && found.some((item) => item.name === "Next.js")) {
    next.frontend = "Next.js";
  }
  if (next.frontend === "Vue" && found.some((item) => item.name === "Nuxt")) {
    next.frontend = "Nuxt";
  }
  if (next.frontend === "Svelte" && found.some((item) => item.name === "SvelteKit")) {
    next.frontend = "SvelteKit";
  }

  if (next.frontend === "Next.js" && !next.backend) {
    const mentionedSeparateBackend = found.some(
      (item) => item.slot === "backend" || item.role === "backend",
    );
    if (!mentionedSeparateBackend) {
      next.backend = "Next.js";
    }
  }

  if (extras.length > 0) {
    next.additional = unique(extras);
  }

  return next;
}

export function interpretStackAnswer(
  answer: string,
  existing?: StackDraft,
): StackDraft {
  const rescued = existing ? rescueStack(existing) : {};
  const parsed = parseStackAnswer(
    [answer, ...(existing?.additional ?? []).filter((item) => isSpokenStackDump(item))].join(
      ". ",
    ),
  );
  return mergeStack(rescued, parsed);
}

export function rescueStack(stack: StackDraft): StackDraft {
  if (!looksLikeStackDump(stack) && hasStructuredStack(stack)) {
    return dropEmptyAdditional(stack);
  }

  const parsed = parseStackAnswer((stack.additional ?? []).join(". "));
  return mergeStack(
    {
      frontend: stack.frontend,
      backend: stack.backend,
      database: stack.database,
      authentication: stack.authentication,
      hosting: stack.hosting,
    },
    parsed,
  );
}

export function isSpokenStackDump(value: string): boolean {
  const text = value.trim();
  if (text.length >= 40) {
    return true;
  }

  return /\b(gw|gue|gua|pake|pakai|aja|fe|be|frontend|backend|trus|terus)\b/i.test(
    text,
  );
}

function findMentions(text: string): Array<TechAlias & { role?: StackSlot }> {
  const mentions: Array<TechAlias & { role?: StackSlot; index: number }> = [];

  for (const tech of TECH) {
    const match = tech.pattern.exec(text);
    if (!match || match.index === undefined) {
      continue;
    }

    mentions.push({
      ...tech,
      index: match.index,
      role: roleBefore(text, match.index),
    });
  }

  return mentions.sort((left, right) => left.index - right.index);
}

function roleBefore(text: string, index: number): StackSlot | undefined {
  const window = text.slice(Math.max(0, index - 48), index);
  let nearest: { slot: StackSlot; at: number } | undefined;

  for (const cue of ROLE_CUES) {
    const matches = window.matchAll(new RegExp(cue.pattern.source, "gi"));
    for (const match of matches) {
      const at = match.index ?? -1;
      if (at >= 0 && (!nearest || at >= nearest.at)) {
        nearest = { slot: cue.slot, at };
      }
    }
  }

  return nearest?.slot;
}

function mergeStack(base: StackDraft, incoming: StackDraft): StackDraft {
  const additional = unique([
    ...(base.additional ?? []).filter((item) => !isSpokenStackDump(item)),
    ...(incoming.additional ?? []),
  ]);

  return dropEmptyAdditional({
    frontend: incoming.frontend ?? base.frontend,
    backend: incoming.backend ?? base.backend,
    database: incoming.database ?? base.database,
    authentication: incoming.authentication ?? base.authentication,
    hosting: incoming.hosting ?? base.hosting,
    additional,
  });
}

function dropEmptyAdditional(stack: StackDraft): StackDraft {
  const additional = (stack.additional ?? []).filter((item) => item.trim().length > 0);
  return {
    ...(stack.frontend ? { frontend: stack.frontend } : {}),
    ...(stack.backend ? { backend: stack.backend } : {}),
    ...(stack.database ? { database: stack.database } : {}),
    ...(stack.authentication ? { authentication: stack.authentication } : {}),
    ...(stack.hosting ? { hosting: stack.hosting } : {}),
    additional,
  };
}

function unique(items: readonly string[]): string[] {
  return [...new Set(items)];
}
