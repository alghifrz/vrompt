import type { Feature, ProjectSpec } from "../schema/project-spec";

export type SpecLanguage = "id" | "en";

export interface DomainEndpoint {
  readonly method: "GET" | "POST" | "PATCH";
  readonly path: string;
  readonly purpose: string;
  readonly authRequired: boolean;
}

export interface DomainNoun {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kind: "actor" | "subject" | "record" | "supporting";
}

export interface DomainFeature {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly priority: Feature["priority"];
  readonly acceptance: readonly string[];
}

export interface DomainRelationship {
  readonly from: string;
  readonly to: string;
  readonly type: string;
  readonly description: string;
}

export interface DomainModel {
  readonly language: SpecLanguage;
  readonly actor: DomainNoun;
  readonly subject?: DomainNoun;
  readonly record: DomainNoun;
  readonly slug: string;
  readonly endpoints: readonly DomainEndpoint[];
  readonly features: readonly DomainFeature[];
  readonly entities: readonly DomainNoun[];
  readonly relationships: readonly DomainRelationship[];
}

const STOPWORDS = new Set([
  "yang",
  "untuk",
  "dengan",
  "secara",
  "tanpa",
  "aplikasi",
  "sistem",
  "web",
  "the",
  "and",
  "with",
  "for",
  "from",
  "this",
  "that",
  "application",
  "product",
  "project",
  "pengguna",
  "user",
  "data",
  "fitur",
  "feature",
  "masih",
  "manual",
  "digital",
  "melalui",
  "sebagai",
  "memungkinkan",
  "melakukan",
  "menggunakan",
  "setiap",
  "hari",
  "atau",
  "serta",
  "lebih",
  "agar",
  "pada",
  "dari",
  "dalam",
  "bisa",
  "sudah",
  "belum",
  "adalah",
  "tetap",
  "nomor",
  "kode",
  "via",
  "main",
  "record",
  "entity",
  "items",
  "item",
  "board",
  "papan",
  "today",
  "cepat",
  "akurat",
  "scattered",
  "toolkit",
  "field",
  "conflicts",
  "lists",
  "quickly",
  "details",
  "live",
  "separate",
  "tools",
  "pencatatan",
  "pengelolaan",
  "proses",
  "service",
  "toko",
  "warung",
  "shop",
  "store",
]);

export function specCorpus(spec: ProjectSpec): string {
  return [
    spec.project.name,
    spec.project.description,
    spec.project.problem,
    spec.project.type,
    ...(spec.project.targetUsers ?? []),
    ...(spec.goals?.primary.map((goal) => goal.statement) ?? []),
    ...(spec.features ?? []).flatMap((feature) => [
      feature.name,
      feature.description,
      ...feature.acceptanceCriteria,
    ]),
    ...(spec.users ?? []).flatMap((user) => [user.name, user.description, ...user.goals]),
  ]
    .join(" ")
    .toLowerCase();
}

export function specLanguage(spec: ProjectSpec): SpecLanguage {
  const text = specCorpus(spec);
  const indonesian = (text.match(/\b(yang|untuk|dengan|secara|tanpa|aplikasi|dari|pada|ini|itu|dan|atau|bisa|ada)\b/g) ?? [])
    .length;
  const english = (text.match(/\b(the|and|with|for|from|this|that|user)\b/g) ?? []).length;
  return indonesian > english ? "id" : "en";
}

export function isPlaceholderEntityName(name: string): boolean {
  return /^(item|items|record|entity|data|main)$/i.test(name.trim());
}

export function isPlaceholderApiPath(path: string): boolean {
  return /^\/api\/items?$/i.test(path.trim());
}

export function wantsOnlyListedFeatures(answer: string | undefined): boolean {
  if (!answer) {
    return false;
  }
  return /\b(hanya (itu|ini)|cukup (itu|ini)|itu saja|itu aja|only this|just that|nothing else)\b/i.test(
    answer,
  );
}

export function shouldExpandFeatures(spec: ProjectSpec, answer?: string): boolean {
  if (wantsOnlyListedFeatures(answer)) {
    return false;
  }
  const current = spec.features ?? [];
  if (current.length >= 3) {
    return false;
  }
  const domain = buildDomainModel(spec);
  if (domain.features.length < 3) {
    return false;
  }
  const covered = current.map((feature) => normalizeName(feature.name));
  const uncovered = domain.entities.filter((entity) => {
    if (entity.kind === "actor") {
      return false;
    }
    const name = normalizeName(entity.name);
    return !covered.some((item) => item.includes(name) || name.includes(item));
  });
  return uncovered.length >= 2;
}

export function isWeakDatabase(spec: ProjectSpec): boolean {
  const entities = spec.database?.entities ?? [];
  if (entities.length === 0) {
    return false;
  }
  if (entities.every((entity) => isPlaceholderEntityName(entity.name))) {
    return true;
  }

  const domain = buildDomainModel(spec);
  const featureNames = new Set((spec.features ?? []).map((feature) => normalizeName(feature.name)));
  const userNames = new Set(
    [...(spec.users ?? []).map((user) => user.name), ...spec.project.targetUsers].map(normalizeName),
  );
  const copiedFeature = entities.some((entity) => featureNames.has(normalizeName(entity.name)));
  const onlyPeople =
    entities.length <= 2 &&
    entities.every(
      (entity) =>
        userNames.has(normalizeName(entity.name)) || entity.name === domain.actor.name,
    );

  if (copiedFeature || onlyPeople) {
    return true;
  }
  return false;
}

export function recommendedFeatures(spec: ProjectSpec, answer?: string): Feature[] {
  const domain = buildDomainModel(spec);
  const mentioned = [
    ...(spec.features ?? []),
    ...featuresFromAnswer(answer, spec.features?.length ?? 0),
  ];
  const merged = new Map<string, Feature>();

  for (const feature of mentioned) {
    merged.set(normalizeName(feature.name), feature);
  }
  for (const feature of domain.features) {
    const key = normalizeName(feature.name);
    if (merged.has(key)) {
      continue;
    }
    merged.set(key, {
      id: feature.id,
      name: feature.name,
      description: feature.description,
      priority: feature.priority,
      status: "planned",
      acceptanceCriteria: [...feature.acceptance],
    });
  }

  return [...merged.values()];
}

export function recommendedDatabase(
  spec: ProjectSpec,
): NonNullable<ProjectSpec["database"]> {
  const domain = buildDomainModel(spec);
  return {
    entities: domain.entities.map((noun, index) => ({
      id: `entity-${String(index + 1)}`,
      name: noun.name,
      description: noun.description,
    })),
    relationships: domain.relationships.map((rel) => ({
      from: rel.from,
      to: rel.to,
      type: rel.type,
      description: rel.description,
    })),
    constraints: [
      domain.language === "id"
        ? `Mulai dari skema kecil untuk ${spec.project.name}. Jangan tambah tabel di luar model ini.`
        : `Start with a small schema for ${spec.project.name}. Do not add tables outside this model.`,
    ],
  };
}

export function buildDomainModel(spec: ProjectSpec): DomainModel {
  const language = specLanguage(spec);
  const actorName =
    spec.users?.[0]?.name ?? spec.project.targetUsers[0] ?? (language === "id" ? "Pengguna" : "User");
  const actor: DomainNoun = {
    id: nounId(actorName),
    name: titleCase(actorName),
    description:
      spec.users?.[0]?.description ??
      (language === "id"
        ? `Orang yang memakai ${spec.project.name}.`
        : `The person who uses ${spec.project.name}.`),
    kind: "actor",
  };

  const terms = interviewTerms(spec, actor.name);
  const subjects = terms.filter((term) => term.kind === "subject" || term.kind === "supporting");
  const records = terms.filter((term) => term.kind === "record");
  const subject = subjects[0];
  const record =
    records[0] ??
    subjects[1] ??
    fallbackRecord(spec, actor, language);
  const entities = dedupeNouns([actor, ...subjects, ...records, record]).slice(0, 7);
  const features = inferredFeatures(spec, actor, entities, language);
  const relationships = inferredRelationships(actor, subject, record, entities, language);

  return {
    language,
    actor,
    subject,
    record,
    slug: slugify(record.name),
    endpoints: inferredEndpoints(language, subject, record),
    features,
    entities,
    relationships,
  };
}

function interviewTerms(spec: ProjectSpec, actorName: string): DomainNoun[] {
  const language = specLanguage(spec);
  const corpus = specCorpus(spec);
  const counts = new Map<string, number>();
  const add = (raw: string, weight: number) => {
    const word = normalizeToken(raw);
    if (!word || isNoiseTerm(word, actorName, spec.project.name)) {
      return;
    }
    counts.set(word, (counts.get(word) ?? 0) + weight);
  };

  for (const extra of namedObjects(spec, actorName)) {
    add(extra, 4);
  }
  for (const match of corpus.matchAll(
    /\b(?:kelola|catat|mencatat|mengelola|manage|record|assign)\s+([a-z]{4,})\b/g,
  )) {
    add(match[1] ?? "", 3);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 6)
    .map(([word]) => {
      const name = titleCase(word);
      return {
        id: nounId(name),
        name,
        description:
          language === "id"
            ? `Data ${name} yang muncul dari wawancara.`
            : `${name} inferred from the interview.`,
        kind: classifyTerm(word, corpus),
      };
    });
}

function namedObjects(spec: ProjectSpec, actorName: string): string[] {
  const extras: string[] = [];
  for (const feature of spec.features ?? []) {
    extras.push(
      ...feature.name
        .replace(/^(meng|mem|men|me)[a-z]*/i, "")
        .split(/\s+/)
        .filter((word) => word.length >= 4),
    );
  }
  extras.push(
    ...spec.project.targetUsers.flatMap((user) => user.split(/\s+/)).filter((word) => word.length >= 4),
    ...spec.project.name.split(/\s+/).filter((word) => word.length >= 4),
  );
  if ((spec.features?.length ?? 0) === 0) {
    extras.push(
      ...`${spec.project.description} ${spec.project.problem}`
        .split(/[^\p{L}]+/u)
        .filter((word) => word.length >= 4),
    );
  }
  return extras.filter((word) => normalizeName(word) !== normalizeName(actorName));
}

function normalizeToken(value: string): string {
  const word = value.toLowerCase();
  if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

function isNoiseTerm(word: string, actorName: string, projectName: string): boolean {
  if (STOPWORDS.has(word) || isLikelyVerb(word)) {
    return true;
  }
  if (normalizeName(word) === normalizeName(actorName)) {
    return true;
  }
  if (normalizeName(word) === `${normalizeName(actorName)}s`) {
    return true;
  }
  if (normalizeName(word) === normalizeName(projectName)) {
    return true;
  }
  return false;
}

function isLikelyVerb(word: string): boolean {
  return (
    /^(meng|mem|men|me|di|ber)[a-z]{3,}$/.test(word) ||
    /^(assign|show|list|help|make|keep|use|manage|record|deliver)$/.test(word)
  );
}

function classifyTerm(word: string, corpus: string): DomainNoun["kind"] {
  if (
    /(pembayaran|penjualan|pesanan|kehadiran|kunjungan|order|payment|visit|attendance|note)/i.test(
      word,
    )
  ) {
    return "record";
  }
  if (
    new RegExp(
      String.raw`\b(catat|mencatat|record|save|simpan|absen|bayar)\w*\s+${word}\b`,
      "i",
    ).test(corpus)
  ) {
    return "record";
  }
  return "subject";
}

function fallbackRecord(
  spec: ProjectSpec,
  actor: DomainNoun,
  language: SpecLanguage,
): DomainNoun {
  const fromFeature = spec.features?.[0]?.name;
  const name = nounFromFeature(fromFeature, spec.project.name, language);
  return {
    id: nounId(name),
    name,
    description:
      spec.features?.[0]?.description ??
      (language === "id"
        ? `Data utama yang ${actor.name} buat dan tinjau.`
        : `The main record ${actor.name} creates and reviews.`),
    kind: "record",
  };
}

function inferredFeatures(
  spec: ProjectSpec,
  actor: DomainNoun,
  entities: readonly DomainNoun[],
  language: SpecLanguage,
): DomainFeature[] {
  const existing = (spec.features ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    priority: item.priority,
    acceptance: item.acceptanceCriteria,
  }));
  const extras: DomainFeature[] = [];
  const covered = new Set(existing.map((item) => normalizeName(item.name)));

  for (const noun of entities) {
    if (noun.kind === "actor") {
      continue;
    }
    const manageName = language === "id" ? `Kelola ${noun.name}` : `Manage ${noun.name}`;
    const recordName = language === "id" ? `Catat ${noun.name}` : `Record ${noun.name}`;
    const title = noun.kind === "record" ? recordName : manageName;
    if (covered.has(normalizeName(title)) || covered.has(normalizeName(noun.name))) {
      continue;
    }
    if (existing.some((item) => normalizeName(item.name).includes(normalizeName(noun.name)))) {
      continue;
    }
    extras.push(
      feature(
        `feature-${slugify(noun.name)}`,
        title,
        language === "id"
          ? `${actor.name} memakai ${noun.name} sebagai bagian dari alur utama.`
          : `${actor.name} uses ${noun.name} in the main flow.`,
        extras.length < 2 ? "must" : "should",
        [
          language === "id"
            ? `${noun.name} bisa disimpan dan dilihat di aplikasi.`
            : `${noun.name} can be saved and viewed in the app.`,
        ],
      ),
    );
    covered.add(normalizeName(title));
  }

  const combined = [...existing, ...extras].slice(0, 6);
  return combined.length > 0
    ? combined
    : [
        feature(
          "feature-main",
          language === "id" ? `Kelola ${entities[1]?.name ?? spec.project.name}` : `Manage ${spec.project.name}`,
          language === "id"
            ? `${actor.name} menyelesaikan pekerjaan utama di ${spec.project.name}.`
            : `${actor.name} completes the main job in ${spec.project.name}.`,
          "must",
          [
            language === "id"
              ? "Alur utama bisa diselesaikan di dalam aplikasi."
              : "The main flow can be finished in-app.",
          ],
        ),
      ];
}

function inferredRelationships(
  actor: DomainNoun,
  subject: DomainNoun | undefined,
  record: DomainNoun,
  entities: readonly DomainNoun[],
  language: SpecLanguage,
): DomainRelationship[] {
  const links: DomainRelationship[] = [];
  if (subject && subject.name !== record.name) {
    links.push(rel(subject.name, record.name, language, "punya banyak", "has many"));
  }
  links.push(rel(actor.name, record.name, language, "mencatat", "creates"));
  for (const noun of entities) {
    if (noun.kind !== "subject" || noun.name === subject?.name || noun.name === record.name) {
      continue;
    }
    links.push(rel(actor.name, noun.name, language, "mengelola", "manages"));
  }
  return links.slice(0, 6);
}

function inferredEndpoints(
  language: SpecLanguage,
  subject: DomainNoun | undefined,
  record: DomainNoun,
): DomainEndpoint[] {
  const recordSlug = slugify(record.name);
  const subjectSlug = subject ? slugify(subject.name) : undefined;
  if (language === "id") {
    return [
      ...(subjectSlug
        ? [
            {
              method: "GET" as const,
              path: `/api/${subjectSlug}`,
              purpose: `Ambil daftar ${subject!.name}.`,
              authRequired: true,
            },
          ]
        : []),
      {
        method: "GET",
        path: `/api/${recordSlug}`,
        purpose: `Lihat daftar ${record.name}.`,
        authRequired: true,
      },
      {
        method: "POST",
        path: `/api/${recordSlug}`,
        purpose: `Simpan ${record.name} baru.`,
        authRequired: true,
      },
    ];
  }
  return [
    ...(subjectSlug
      ? [
          {
            method: "GET" as const,
            path: `/api/${subjectSlug}`,
            purpose: `List ${subject!.name} records.`,
            authRequired: true,
          },
        ]
      : []),
    {
      method: "GET",
      path: `/api/${recordSlug}`,
      purpose: `List ${record.name} records.`,
      authRequired: true,
    },
    {
      method: "POST",
      path: `/api/${recordSlug}`,
      purpose: `Create a ${record.name}.`,
      authRequired: true,
    },
  ];
}

function featuresFromAnswer(answer: string | undefined, startIndex: number): Feature[] {
  if (!answer || wantsOnlyListedFeatures(answer)) {
    return [];
  }
  const trimmed = answer.trim();
  if (trimmed.length < 8) {
    return [];
  }
  if (/^(ok|oke|iya|ya|lanjut|gatau|idk|skip)\b/i.test(trimmed)) {
    return [];
  }
  return [
    {
      id: `feature-${String(startIndex + 1)}`,
      name: titleCase(trimmed.split(/[,.\n]/)[0]?.trim() || trimmed).slice(0, 48),
      description: trimmed,
      priority: "must",
      status: "planned",
      acceptanceCriteria: [],
    },
  ];
}

function feature(
  id: string,
  name: string,
  description: string,
  priority: Feature["priority"],
  acceptance: readonly string[],
): DomainFeature {
  return { id, name, description, priority, acceptance };
}

function rel(
  from: string,
  to: string,
  language: SpecLanguage,
  idLabel: string,
  enLabel: string,
): DomainRelationship {
  return {
    from,
    to,
    type: "one-to-many",
    description: language === "id" ? `${from} ${idLabel} ${to}.` : `${from} ${enLabel} ${to}.`,
  };
}

function nounFromFeature(
  featureName: string | undefined,
  projectName: string,
  language: SpecLanguage,
): string {
  if (featureName) {
    const cleaned = featureName
      .replace(/^(meng|mem|men|me)/i, "")
      .replace(/\b(siswa|user|data|fitur|feature)\b/gi, "")
      .trim();
    if (cleaned.length >= 3) {
      return titleCase(cleaned);
    }
  }
  return language === "id" ? `Catatan ${projectName}` : `${projectName} Record`;
}

function dedupeNouns(nouns: readonly DomainNoun[]): DomainNoun[] {
  const seen = new Set<string>();
  return nouns.filter((noun) => {
    const key = normalizeName(noun.name);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function nounId(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9]+/g, "") || "Entity";
  return /^[A-Za-z]/.test(cleaned) ? cleaned : `E${cleaned}`;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "records"
  );
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
