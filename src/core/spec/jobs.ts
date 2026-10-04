import type { Feature, ProjectSpec } from "../schema/project-spec";
import {
  isAbstractNoun,
  isJobVerb,
  isJunkNoun,
  isMethodWord,
  isSeasonWord,
  isTimeWord,
  isWorkNoun,
  looksLikeChattyLabel,
  looksLikeJunkLabel,
  singularizeNoun,
} from "./lexicon";

type SpecLanguage = "id" | "en";

export interface ProductJob {
  readonly verb: string;
  readonly object: string;
  readonly name: string;
  readonly kind: "capture" | "manage" | "view";
}

const JOB_PATTERN =
  /\b(catat|mencatat|kelola|mengelola|absen|mengabsen|bayar|membayar|jual|menjual|lihat|melihat|lacak|melacak|atur|mengatur|simpan|menyimpan|assign|record|manage|track|pay|sell|view|list|pencatatan|pengelolaan|nyatet|ingetin|ngingetin|remind)\s+([a-z]{3,})\b/gi;

const CAPTURE_VERBS =
  /^(catat|mencatat|absen|mengabsen|bayar|membayar|jual|menjual|simpan|menyimpan|record|pay|sell|pencatatan)$/i;

const NOISE = new Set([
  "yang",
  "untuk",
  "dengan",
  "aplikasi",
  "sistem",
  "data",
  "fitur",
  "feature",
  "user",
  "pengguna",
  "manual",
  "digital",
  "this",
  "that",
  "app",
  "product",
  "project",
  "lewat",
  "via",
  "rekening",
  "tetap",
  "mudah",
  "semua",
  "utama",
  "pekerjaan",
  "tracker",
  "proses",
  "secara",
]);

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeObject(value: string): string {
  return singularizeNoun(value);
}

function jobName(
  verb: string,
  object: string,
  language: SpecLanguage,
  kind: ProductJob["kind"],
): string {
  const noun = titleCase(object);
  if (kind === "view") {
    return language === "id" ? `Lihat ${noun}` : `View ${noun}`;
  }
  if (/^(inget|remind)/i.test(verb)) {
    return language === "id" ? `Ingatkan ${noun}` : `Remind ${noun}`;
  }
  if (kind === "capture" || CAPTURE_VERBS.test(verb)) {
    return language === "id" ? `Catat ${noun}` : `Record ${noun}`;
  }
  return language === "id" ? `Kelola ${noun}` : `Manage ${noun}`;
}

function addJob(
  jobs: ProductJob[],
  seen: Set<string>,
  verb: string,
  object: string,
  language: SpecLanguage,
  kind: ProductJob["kind"],
) {
  const normalized = normalizeObject(object);
  if (
    normalized.length < 3 ||
    NOISE.has(normalized) ||
    isJobVerb(normalized) ||
    isMethodWord(normalized) ||
    isJunkNoun(normalized) ||
    isTimeWord(normalized) ||
    isSeasonWord(normalized) ||
    isAbstractNoun(normalized) ||
    looksLikeJunkLabel(normalized)
  ) {
    return;
  }
  const key = normalizeObject(normalized);
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  jobs.push({
    verb: verb.toLowerCase(),
    object: titleCase(normalized),
    name: jobName(verb, normalized, language, kind),
    kind: CAPTURE_VERBS.test(verb) ? "capture" : kind,
  });
}

function jobCorpus(spec: ProjectSpec, extra: string): string {
  return [
    spec.project.description,
    ...(spec.goals?.primary.map((goal) => goal.statement) ?? []),
    ...(spec.features ?? []).flatMap((feature) => [feature.name, feature.description]),
    extra,
  ]
    .join(" ")
    .toLowerCase();
}

function jobLanguage(text: string): SpecLanguage {
  const indonesian = (text.match(/\b(yang|untuk|dengan|aplikasi|dari|dan|atau|masih)\b/g) ?? []).length;
  const english = (text.match(/\b(the|and|with|for|from|this|that)\b/g) ?? []).length;
  return indonesian >= english ? "id" : "en";
}

export function extractJobs(spec: ProjectSpec, extra = ""): ProductJob[] {
  const corpus = jobCorpus(spec, extra);
  const language = jobLanguage(corpus);
  const jobs: ProductJob[] = [];
  const seen = new Set<string>();

  for (const match of corpus.matchAll(JOB_PATTERN)) {
    addJob(
      jobs,
      seen,
      match[1] ?? "",
      match[2] ?? "",
      language,
      CAPTURE_VERBS.test(match[1] ?? "") ? "capture" : "manage",
    );
  }

  for (const match of corpus.matchAll(
    /\b(catat|mencatat|kelola|mengelola|ingetin|ngingetin|ingatkan|remind|record|manage)\s+(.+?)(?:\b(?:biar|supaya|agar|buat|untuk)\b|$)/gi,
  )) {
    const verb = match[1] ?? "catat";
    const tail = match[2] ?? "";
    for (const part of tail.split(/,| dan | sama | and /i)) {
      const object =
        part
          .split(/\s+/)
          .map((word) => word.replace(/[^\p{L}-]/gu, ""))
          .find((word) => isWorkNoun(word) && !NOISE.has(word.toLowerCase())) ?? "";
      addJob(
        jobs,
        seen,
        verb,
        object,
        language,
        /ingat|remind/i.test(verb) ? "manage" : "capture",
      );
    }
  }

  for (const match of corpus.matchAll(
    /\b((?:catat|mencatat|kelola|mengelola|record|manage)\s+[a-z]{3,})\s+(?:sama|dan|and|,)\s+([a-z]{3,})\b/g,
  )) {
    addJob(jobs, seen, "catat", match[2] ?? "", language, "capture");
  }

  for (const match of corpus.matchAll(/\b([a-z]{4,})\s+(?:lewat|via|melalui)\b/g)) {
    addJob(jobs, seen, "catat", match[1] ?? "", language, "capture");
  }

  for (const feature of spec.features ?? []) {
    if (looksLikeChattyLabel(feature.name)) {
      const object = feature.name.split(/\s+/)[0] ?? feature.name;
      addJob(jobs, seen, "catat", object, language, "capture");
      continue;
    }
    const object = feature.name
      .replace(
          /^(meng[a-z]+|mem[a-z]+|men[a-z]+|catat|kelola|record|manage|lihat|view|ingatkan|remind)\s+/i,
          "",
        )
      .trim();
    if (object.split(/\s+/).length <= 4) {
      addJob(jobs, seen, "kelola", object.split(/\s+/)[0] ?? object, language, "manage");
    }
  }

  if (jobs.length === 0) {
    const fallback = extra
      .split(/[,.\n]/)[0]
      ?.replace(/[^\p{L}\s-]+/gu, " ")
      .trim();
      const object = fallback
        ?.split(/\s+/)
        .filter(
          (word) =>
            word.length >= 4 &&
            !NOISE.has(word.toLowerCase()) &&
            !isJunkNoun(word) &&
            !isJobVerb(word),
        )[0];
    if (object) {
      addJob(jobs, seen, "kelola", object, language, "manage");
    }
  }

  const main = jobs.find((job) => job.kind === "capture") ?? jobs[0];
  if (main && !jobs.some((job) => job.kind === "view" && job.object === main.object)) {
    jobs.push({
      verb: language === "id" ? "lihat" : "view",
      object: main.object,
      name: jobName("lihat", main.object, language, "view"),
      kind: "view",
    });
  }

  return jobs.slice(0, 6);
}

export function featuresFromJobs(
  spec: ProjectSpec,
  jobs: readonly ProductJob[],
): Feature[] {
  const language = jobLanguage(jobCorpus(spec, ""));
  const actor = spec.users?.[0]?.name ?? spec.project.targetUsers[0] ?? (language === "id" ? "Pengguna" : "User");

  return jobs.map((job, index) => ({
    id: `feature-${job.object.toLowerCase().replace(/[^a-z0-9]+/g, "") || String(index + 1)}`,
    name: job.name,
    description:
      language === "id"
        ? `${actor} dapat ${job.verb} ${job.object.toLowerCase()} di aplikasi.`
        : `${actor} can ${job.verb} ${job.object.toLowerCase()} in the app.`,
    priority: index < 2 ? ("must" as const) : ("should" as const),
    status: "planned" as const,
    acceptanceCriteria: [
      language === "id"
        ? `${job.object} bisa disimpan dan dilihat lagi.`
        : `${job.object} can be saved and opened again.`,
    ],
  }));
}
