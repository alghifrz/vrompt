import type { Feature, ProjectSpec } from "../schema/project-spec";
import {
  buildDomainModel,
  isPlaceholderApiPath,
  isPlaceholderEntityName,
  recommendedFeatures,
  shouldExpandFeatures,
  specLanguage,
  type DomainModel,
} from "../spec/domain";
import type { GeneratedFile } from "./types";

export interface GenerationJob {
  readonly id: string;
  readonly step: number;
  readonly title: string;
  readonly summary: string;
  readonly prompt: string;
}

const MAX_INDIVIDUAL_FEATURES = 8;

export function buildGenerationJobs(spec: ProjectSpec): GenerationJob[] {
  const must = featuresByPriority(spec, "must");
  const should = featuresByPriority(spec, "should");
  const drafts: Array<Omit<GenerationJob, "step">> = [bootstrapJob(spec)];

  if (needsFoundation(spec)) {
    drafts.push(foundationJob(spec));
  }

  const featureJobs = [
    ...must.map((feature) => featureJob(spec, feature)),
    ...shouldJobs(spec, should, must.length),
  ];
  drafts.push(...featureJobs);

  if (featureJobs.length === 0 && spec.goals?.primary.length) {
    drafts.push(outcomeJob(spec));
  }

  if (needsUsersJob(spec)) {
    drafts.push(usersJob(spec));
  }

  if (needsApiJob(spec)) {
    drafts.push(apiJob(spec));
  }

  if (needsRulesJob(spec)) {
    drafts.push(rulesJob(spec));
  }

  if (drafts.length >= 2) {
    drafts.push(wrapUpJob(spec));
  }

  return drafts.map((job, index) => ({ ...job, step: index + 1 }));
}

export function renderJobFiles(
  jobs: readonly GenerationJob[],
  projectName: string,
): GeneratedFile[] {
  return [
    {
      path: "README.md",
      content: renderJobsReadme(jobs, projectName),
    },
    ...jobs.map((job) => ({
      path: jobFilename(job),
      content: renderJobMarkdown(job),
    })),
  ];
}

export function buildJobPack(spec: ProjectSpec): {
  jobs: GenerationJob[];
  files: GeneratedFile[];
} {
  const jobs = buildGenerationJobs(spec);
  return {
    jobs,
    files: renderJobFiles(jobs, spec.project.name),
  };
}

function bootstrapJob(spec: ProjectSpec): Omit<GenerationJob, "step"> {
  const words = jobCopy(spec);
  const stack = stackLine(spec);
  const domain = buildDomainModel(spec);
  return {
    id: "job-bootstrap",
    title: words.bootstrapTitle,
    summary: words.bootstrapSummary(spec),
    prompt: beginnerPrompt(spec, words.bootstrapTitle, {
      why: [
        spec.project.description,
        spec.project.problem ? words.problem(spec.project.problem) : "",
      ],
      steps: words.bootstrapSteps(spec, stack),
      done: words.bootstrapDone(spec),
      avoid: words.bootstrapAvoid(domain),
    }),
  };
}

function foundationJob(spec: ProjectSpec): Omit<GenerationJob, "step"> {
  const words = jobCopy(spec);
  const domain = buildDomainModel(spec);
  const entities = jobEntities(spec);
  const endpoints = needsApiJob(spec) ? [] : jobEndpoints(spec);
  return {
    id: "job-foundation",
    title: words.foundationTitle,
    summary: words.foundationSummary,
    prompt: beginnerPrompt(spec, words.foundationTitle, {
      why: [words.foundationWhy],
      steps: words.foundationSteps(spec, domain, entities, endpoints),
      done: words.foundationDone(entities),
      avoid: words.foundationAvoid,
    }),
  };
}

function featureJob(
  spec: ProjectSpec,
  feature: Feature,
): Omit<GenerationJob, "step"> {
  const words = jobCopy(spec);
  const domain = buildDomainModel(spec);
  const actor = spec.users?.[0];
  return {
    id: `job-feature-${feature.id}`,
    title: feature.name,
    summary: feature.description,
    prompt: beginnerPrompt(spec, feature.name, {
      why: [
        feature.description,
        words.priority(feature.priority),
        actor && !needsUsersJob(spec)
          ? words.primaryUser(actor.name, actor.description)
          : "",
      ],
      steps: words.featureSteps(feature, domain),
      done: feature.acceptanceCriteria.length
        ? feature.acceptanceCriteria
        : words.featureDone(feature.name),
      avoid: words.featureAvoid(feature.name, domain),
    }),
  };
}

function shouldJobs(
  spec: ProjectSpec,
  should: readonly Feature[],
  mustCount: number,
): Array<Omit<GenerationJob, "step">> {
  if (should.length === 0) {
    return [];
  }

  if (mustCount + should.length <= MAX_INDIVIDUAL_FEATURES) {
    return should.map((feature) => featureJob(spec, feature));
  }

  return [groupedFeaturesJob(spec, should)];
}

function groupedFeaturesJob(
  spec: ProjectSpec,
  features: readonly Feature[],
): Omit<GenerationJob, "step"> {
  const words = jobCopy(spec);
  const names = features.map((feature) => feature.name).join(", ");
  return {
    id: "job-should-features",
    title: words.shouldTitle,
    summary: words.shouldSummary(names),
    prompt: beginnerPrompt(spec, words.shouldTitle, {
      why: [words.shouldWhy],
      steps: features.map((feature) => {
        const acceptance = feature.acceptanceCriteria.length
          ? ` ${words.acceptanceLabel} ${feature.acceptanceCriteria.join("; ")}`
          : "";
        return `${feature.name}: ${feature.description}${acceptance}`;
      }),
      done: [words.shouldDone],
      avoid: [words.shouldAvoid],
    }),
  };
}

function outcomeJob(spec: ProjectSpec): Omit<GenerationJob, "step"> {
  const words = jobCopy(spec);
  const goal = spec.goals!.primary[0]!;
  return {
    id: "job-outcome",
    title: words.outcomeTitle,
    summary: goal.statement,
    prompt: beginnerPrompt(spec, words.outcomeTitle, {
      why: [words.outcomeWhy(goal.statement)],
      steps: words.outcomeSteps(spec),
      done: spec.goals!.successCriteria.length
        ? spec.goals!.successCriteria
        : [goal.statement],
      avoid: words.outcomeAvoid,
    }),
  };
}

function usersJob(spec: ProjectSpec): Omit<GenerationJob, "step"> {
  const words = jobCopy(spec);
  return {
    id: "job-users",
    title: words.usersTitle,
    summary: words.usersSummary,
    prompt: beginnerPrompt(spec, words.usersTitle, {
      why: [words.usersWhy],
      steps: spec.users!.map((user) => {
        const permissions = user.permissions.length
          ? ` ${words.canLabel} ${user.permissions.join(", ")}.`
          : "";
        return `${user.name}: ${user.description}${permissions}`;
      }),
      done: words.usersDone,
      avoid: words.usersAvoid,
    }),
  };
}

function apiJob(spec: ProjectSpec): Omit<GenerationJob, "step"> {
  const words = jobCopy(spec);
  const endpoints = jobEndpoints(spec);
  return {
    id: "job-api",
    title: words.apiTitle,
    summary: words.apiSummary,
    prompt: beginnerPrompt(spec, words.apiTitle, {
      why: [words.apiWhy],
      steps: [
        ...endpoints.map(
          (endpoint) =>
            `${endpoint.method} ${endpoint.path} — ${endpoint.purpose}${
              endpoint.authRequired ? ` (${words.authRequired})` : ""
            }`,
        ),
        words.apiThin,
      ],
      done: words.apiDone(endpoints),
      avoid: words.apiAvoid,
    }),
  };
}

function rulesJob(spec: ProjectSpec): Omit<GenerationJob, "step"> {
  const words = jobCopy(spec);
  return {
    id: "job-rules",
    title: words.rulesTitle,
    summary: words.rulesSummary,
    prompt: beginnerPrompt(spec, words.rulesTitle, {
      why: [words.rulesWhy],
      steps: spec.aiRules!.map((rule) => `${rule.title}: ${rule.body}`),
      done: words.rulesDone,
      avoid: words.rulesAvoid,
    }),
  };
}

function wrapUpJob(spec: ProjectSpec): Omit<GenerationJob, "step"> {
  const words = jobCopy(spec);
  const criteria = spec.goals?.successCriteria ?? [];
  const later = featuresByPriority(spec, "later");
  return {
    id: "job-wrap-up",
    title: words.wrapTitle,
    summary: words.wrapSummary,
    prompt: beginnerPrompt(spec, words.wrapTitle, {
      why: [words.wrapWhy(spec.project.name)],
      steps: [
        ...criteria,
        later.length ? words.leaveLater(later.map((feature) => feature.name).join(", ")) : "",
      ],
      done: words.wrapDone,
      avoid: words.wrapAvoid,
    }),
  };
}

function needsFoundation(spec: ProjectSpec): boolean {
  return Boolean(spec.stack || spec.architecture || spec.database || spec.security);
}

function needsUsersJob(spec: ProjectSpec): boolean {
  const users = spec.users ?? [];
  if (users.length < 2) {
    return false;
  }
  return users.some((user) => user.permissions.length > 0);
}

function needsApiJob(spec: ProjectSpec): boolean {
  return (spec.api?.endpoints.length ?? 0) >= 3;
}

function needsRulesJob(spec: ProjectSpec): boolean {
  return (spec.aiRules?.filter((rule) => rule.priority === "must").length ?? 0) >= 2;
}

function featuresByPriority(
  spec: ProjectSpec,
  priority: Feature["priority"],
): Feature[] {
  const features = shouldExpandFeatures(spec) ? recommendedFeatures(spec) : spec.features ?? [];
  return features
    .filter((feature) => feature.priority === priority)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function stackLine(spec: ProjectSpec): string {
  if (!spec.stack) {
    return "";
  }

  return [
    spec.stack.frontend,
    spec.stack.backend,
    spec.stack.database,
    spec.stack.authentication,
    spec.stack.hosting,
    ...(spec.stack.additional ?? []),
  ]
    .filter((item): item is string => Boolean(item))
    .filter((item, index, all) => all.indexOf(item) === index)
    .join(", ");
}

function beginnerPrompt(
  spec: ProjectSpec,
  title: string,
  parts: {
    why: readonly string[];
    steps: readonly string[];
    done: readonly string[];
    avoid: readonly string[];
  },
): string {
  const words = jobCopy(spec);
  return [
    words.intro(spec.project.name),
    "",
    words.readRules,
    "",
    `${words.jobLabel} ${title}`,
    "",
    words.whyHeading,
    ...parts.why.filter((line) => line.trim().length > 0).map((line) => `- ${line}`),
    "",
    ...(parts.steps.filter((line) => line.trim().length > 0).length
      ? [
          words.stepsHeading,
          ...parts.steps
            .filter((line) => line.trim().length > 0)
            .map((line, index) => `${index + 1}. ${line}`),
          "",
        ]
      : []),
    ...(parts.done.filter((line) => line.trim().length > 0).length
      ? [
          words.doneHeading,
          ...parts.done.filter((line) => line.trim().length > 0).map((line) => `- ${line}`),
          "",
        ]
      : []),
    words.avoidHeading,
    ...parts.avoid.filter((line) => line.trim().length > 0).map((line) => `- ${line}`),
    `- ${words.stop}`,
  ].join("\n");
}

function jobEntities(spec: ProjectSpec): string[] {
  const existing = spec.database?.entities ?? [];
  if (existing.length === 0 || existing.every((entity) => isPlaceholderEntityName(entity.name))) {
    const domain = buildDomainModel(spec);
    return [domain.actor, domain.subject, domain.record]
      .filter((noun): noun is NonNullable<typeof noun> => Boolean(noun))
      .map((noun) => noun.name);
  }
  return existing.map((entity) => entity.name);
}

function jobEndpoints(spec: ProjectSpec): Array<{
  method: string;
  path: string;
  purpose: string;
  authRequired: boolean;
}> {
  const existing = spec.api?.endpoints ?? [];
  if (existing.length === 0 || existing.every((endpoint) => isPlaceholderApiPath(endpoint.path))) {
    return [...buildDomainModel(spec).endpoints];
  }
  return existing;
}

function jobCopy(spec: ProjectSpec) {
  const id = specLanguage(spec) === "id";

  return {
    bootstrapTitle: id ? "Siapkan proyek" : "Bootstrap the repo",
    bootstrapSummary: (project: ProjectSpec) =>
      id
        ? `Buat ${project.project.type} pertama untuk ${project.project.name}.`
        : `Create the first ${project.project.type} for ${project.project.name}.`,
    problem: (text: string) => (id ? `Masalah yang diselesaikan: ${text}` : `Problem to solve: ${text}`),
    bootstrapSteps: (project: ProjectSpec, stack: string) => [
      id
        ? `Buat aplikasi ${project.project.type} bernama ${project.project.name} yang bisa dijalankan secara lokal.`
        : `Scaffold ${project.project.name} as a runnable ${project.project.type}.`,
      stack
        ? id
          ? `Pakai stack ini: ${stack}. Jangan ganti kecuali spek memaksa.`
          : `Use this stack: ${stack}. Do not switch unless the spec forces it.`
        : id
          ? "Pilih stack yang sudah disebut di spek. Jangan menambah layanan baru."
          : "Use the stack already named in the spec. Do not add new services.",
      id
        ? "Siapkan halaman awal, layout, dan satu perintah untuk menjalankan aplikasi."
        : "Set up the first page, layout, and one command that starts the app.",
      id
        ? "Tulis README singkat: cara install, cara jalankan, dan apa yang belum dikerjakan."
        : "Write a short README: install, run, and what is not built yet.",
    ],
    bootstrapDone: (project: ProjectSpec) => [
      id
        ? `${project.project.name} bisa dibuka di browser tanpa error.`
        : `${project.project.name} opens in the browser without errors.`,
      id
        ? "Belum ada fitur produk. Hanya kerangka."
        : "No product feature is implemented yet. This is only the shell.",
    ],
    bootstrapAvoid: (domain: DomainModel) => [
      id
        ? `Jangan kerjakan ${domain.record.name} atau layar absen di job ini.`
        : `Do not build ${domain.record.name} screens in this job.`,
      id ? "Jangan menambah library yang tidak disebut di spek." : "Do not add libraries the spec did not name.",
    ],
    foundationTitle: id ? "Bangun fondasi" : "Lay the foundation",
    foundationSummary: id
      ? "Siapkan auth, data, dan bentuk aplikasi sebelum fitur."
      : "Set up auth, data, and the first app shape before features.",
    foundationWhy: id
      ? "Fitur tidak boleh dimulai sebelum login dan tabel utama sudah ada."
      : "Features should not start before login and the main tables exist.",
    foundationSteps: (
      project: ProjectSpec,
      domain: DomainModel,
      entities: readonly string[],
      endpoints: readonly { method: string; path: string; purpose: string }[],
    ) => [
      project.stack?.authentication || project.security?.authentication?.[0]
        ? id
          ? `Pasang autentikasi ${project.stack?.authentication ?? project.security?.authentication?.[0]}. ${domain.actor.name} harus bisa masuk.`
          : `Install ${project.stack?.authentication ?? project.security?.authentication?.[0]} auth. ${domain.actor.name} must be able to sign in.`
        : id
          ? "Kalau spek minta login, pasang auth sekarang. Kalau tidak, lewati."
          : "If the spec needs login, add auth now. Otherwise skip it.",
      project.stack?.database || entities.length
        ? id
          ? `Buat skema ${project.stack?.database ?? "Postgres"} untuk: ${entities.join(", ")}. Jangan buat tabel Item.`
          : `Create the ${project.stack?.database ?? "Postgres"} schema for: ${entities.join(", ")}. Do not create an Item table.`
        : id
          ? "Siapkan akses database kosong yang aman."
          : "Prepare a safe empty database connection.",
      project.architecture?.style
        ? id
          ? `Ikuti arsitektur ${project.architecture.style}. Tetap satu aplikasi.`
          : `Follow ${project.architecture.style} architecture. Keep it one app.`
        : id
          ? "Tetap satu aplikasi. Jangan pecah jadi banyak service."
          : "Keep one app. Do not split into extra services.",
      ...endpoints.map((endpoint) =>
        id
          ? `Siapkan ${endpoint.method} ${endpoint.path} — ${endpoint.purpose}.`
          : `Prepare ${endpoint.method} ${endpoint.path} — ${endpoint.purpose}.`,
      ),
      id
        ? "Buktikan fondasi dengan satu halaman terlindungi setelah login."
        : "Prove the foundation with one protected page after sign-in.",
    ],
    foundationDone: (entities: readonly string[]) => [
      id
        ? `Tabel ${entities.join(", ") || "utama"} ada dan bisa di-query.`
        : `The ${entities.join(", ") || "main"} tables exist and can be queried.`,
      id
        ? "Pengguna bisa masuk. Layar produk belum lengkap."
        : "A user can sign in. Product screens are not finished yet.",
    ],
    foundationAvoid: id
      ? ["Jangan membangun seluruh fitur di job ini.", "Jangan menambah endpoint di luar daftar."]
      : ["Do not build the full product screens in this job.", "Do not invent extra endpoints."],
    priority: (value: string) => (id ? `Prioritas: ${value}.` : `Priority: ${value}.`),
    primaryUser: (name: string, description: string) =>
      id ? `Pengguna utama: ${name}. ${description}` : `Primary user: ${name}. ${description}`,
    featureSteps: (feature: Feature, domain: DomainModel) => featureJobSteps(feature, domain, id),
    featureDone: (name: string) =>
      id
        ? [`${name} bisa diselesaikan di dalam aplikasi.`, "Pesan error terlihat dan data tidak hilang."]
        : [`A user can complete ${name} without leaving the app.`, "Failure states are visible and recoverable."],
    featureAvoid: (name: string, domain: DomainModel) => [
      id
        ? `Kerjakan hanya ${name}. Jangan mulai fitur berikutnya.`
        : `Implement only this feature. Reuse the existing foundation. Do not start the next feature.`,
      id
        ? `Jangan membuat entitas Item atau /api/items. Pakai ${[domain.actor.name, domain.subject?.name, domain.record.name].filter(Boolean).join(", ")}.`
        : `Do not invent an Item entity or /api/items. Reuse ${[domain.actor.name, domain.subject?.name, domain.record.name].filter(Boolean).join(", ")}.`,
    ],
    shouldTitle: id ? "Tambah fitur should-have" : "Add the should-have features",
    shouldSummary: (names: string) =>
      id
        ? `Kerjakan ini hanya setelah must-have jalan: ${names}.`
        : `Ship these only after the must-haves work: ${names}.`,
    shouldWhy: id
      ? "Must-have sudah jalan. Tambah hanya item should-have, satu per satu jika perlu."
      : "The must-have features already work. Add only these should-have items, one at a time if needed.",
    shouldDone: id ? "Setiap item should-have yang dikerjakan bisa dipakai." : "Each started should-have item works.",
    shouldAvoid: id
      ? "Berhenti jika item should-have mulai menambah lingkup."
      : "Stop if a should-have item starts to expand scope.",
    outcomeTitle: id ? "Selesaikan hasil pertama" : "Deliver the first outcome",
    outcomeWhy: (statement: string) =>
      id ? `Hasil utama: ${statement}` : `Primary outcome: ${statement}`,
    outcomeSteps: (project: ProjectSpec) => [
      id
        ? `Bangun jalur terkecil agar ${project.project.name} menyelesaikan hasil utama.`
        : "Build the smallest path that makes this outcome real.",
      id
        ? "Tampilkan satu layar yang menjelaskan masalah, lalu aksi utama."
        : "Show one screen that explains the problem, then the main action.",
    ],
    outcomeAvoid: id
      ? ["Jangan menambah fitur di luar hasil utama."]
      : ["Do not add features outside this outcome."],
    usersTitle: id ? "Sesuaikan dengan penggunanya" : "Fit the product to its users",
    usersSummary: id
      ? "Buat layar dan izin sesuai orang yang memakai aplikasi."
      : "Make screens and permissions match the people who will use it.",
    usersWhy: id
      ? "Setiap peran harus melihat menu, state kosong, dan izin yang cocok."
      : "Adjust navigation, empty states, and permissions for these users.",
    canLabel: id ? "Boleh:" : "Can:",
    usersDone: id
      ? ["Setiap peran hanya melihat aksi yang diizinkan.", "State kosong memberi tahu langkah berikutnya."]
      : ["Each role only sees allowed actions.", "Empty states tell the user what to do next."],
    usersAvoid: id ? ["Jangan menambah tipe pengguna baru."] : ["Do not add a new user type."],
    apiTitle: id ? "Tambah API pertama" : "Add the first API",
    apiSummary: id
      ? "Buka hanya endpoint yang versi pertama butuhkan."
      : "Expose the endpoints the first version actually needs.",
    apiWhy: id
      ? "Implementasikan hanya endpoint berikut."
      : "Implement only these endpoints.",
    authRequired: id ? "wajib masuk" : "auth required",
    apiThin: id
      ? "Handler tetap tipis. Validasi input. Kembalikan error yang bisa dibaca."
      : "Keep handlers thin. Validate input. Return readable errors.",
    apiDone: (endpoints: readonly { method: string; path: string }[]) =>
      endpoints.map((endpoint) =>
        id
          ? `${endpoint.method} ${endpoint.path} merespons dengan data yang benar.`
          : `${endpoint.method} ${endpoint.path} returns the correct data.`,
      ),
    apiAvoid: id
      ? ["Jangan menambah route baru.", "Jangan membuat /api/items."]
      : ["Do not invent extra routes.", "Do not create /api/items."],
    rulesTitle: id ? "Terapkan aturan proyek" : "Apply the project rules",
    rulesSummary: id
      ? "Rapikan kode supaya mengikuti aturan spek."
      : "Clean the code so it follows the spec rules.",
    rulesWhy: id
      ? "Refactor hanya yang perlu agar aturan ini dipatuhi."
      : "Refactor only enough to follow these rules.",
    rulesDone: id
      ? ["Kode mengikuti aturan must tanpa menambah fitur."]
      : ["The code follows the must rules without new features."],
    rulesAvoid: id
      ? ["Jangan menambah fitur sambil merapikan."]
      : ["Do not add features while cleaning this up."],
    wrapTitle: id ? "Rapikan versi pertama" : "Wrap up the first version",
    wrapSummary: id
      ? "Cocokkan versi pertama dengan spek, lalu berhenti."
      : "Check the first version against the spec and stop.",
    wrapWhy: (name: string) =>
      id
        ? `Pastikan ${name} menutup spek tanpa lingkup tambahan.`
        : `Confirm ${name} covers the spec without extra scope.`,
    leaveLater: (names: string) =>
      id ? `Tinggalkan ini untuk nanti: ${names}.` : `Leave these for later: ${names}.`,
    wrapDone: id
      ? ["Alur utama bisa didemo dari masuk sampai selesai.", "Tidak ada blocker yang tersisa."]
      : ["The main path can be demoed from sign-in to done.", "No blockers remain."],
    wrapAvoid: id
      ? ["Perbaiki hanya blocker. Jangan mulai v2."]
      : ["Fix only blockers. Do not start a v2."],
    intro: (name: string) =>
      id
        ? `Kerjakan satu job ini untuk ${name}. Target pembacanya pemula: ikuti langkah berurutan, jangan loncat.`
        : `Implement this job for ${name}.`,
    readRules:
      id
        ? "Baca dulu aturan proyek yang diekspor (AGENTS.md dan file .cursor/rules, .qoder/rules, atau CLAUDE.md dari ZIP). Jangan menambah fitur di luar job ini. Do not invent features."
        : "Read the exported project rules first (AGENTS.md and any .cursor/rules, .qoder/rules, or CLAUDE.md from the ZIP). Do not invent features.",
    jobLabel: id ? "Job —" : "Job —",
    whyHeading: id ? "## Kenapa job ini ada" : "## Why this job exists",
    stepsHeading: id ? "## Kerjakan berurutan" : "## Do this, in order",
    doneHeading: id ? "## Selesai kalau" : "## Done when",
    avoidHeading: id ? "## Jangan" : "## Do not",
    stop: id
      ? "Kerjakan hanya job ini. Tetap kecil. Berhenti ketika sudah jalan."
      : "Build only this job. Keep the first version small. Stop when it works.",
    acceptanceLabel: id ? "Penerimaan:" : "Acceptance:",
  };
}

function featureJobSteps(feature: Feature, domain: DomainModel, indonesian: boolean): string[] {
  if (domain.theme === "attendance" && indonesian) {
    return [
      `${domain.actor.name} masuk, lalu melihat daftar ${domain.subject?.name ?? "siswa"} untuk hari ini. Kalau daftar kosong, tampilkan apa yang harus dilakukan.`,
      `Di samping setiap nama, sediakan pilihan hadir, izin, sakit, dan alpha.`,
      `Satu tombol simpan menulis ${domain.record.name} untuk tanggal itu. Jangan minta ${domain.actor.name} mengisi form panjang per siswa.`,
      `Setelah simpan, tampilkan ringkasan: berapa hadir, izin, sakit, dan alpha.`,
      `Kalau simpan gagal, tampilkan pesan yang bisa dipahami dan jangan hapus pilihan yang sudah diklik.`,
      `Kriteria penerimaan: ${feature.acceptanceCriteria.join("; ") || feature.description}`,
    ];
  }
  if (domain.theme === "attendance") {
    return [
      `${domain.actor.name} signs in and sees today's ${domain.subject?.name ?? "student"} list. If the list is empty, say what to do next.`,
      `Next to each name, offer present, excused, sick, and absent.`,
      `One save writes ${domain.record.name} for that date. Do not force a long form per student.`,
      `After save, show a summary count.`,
      `If save fails, show a recoverable error and keep the chosen marks.`,
      `Acceptance: ${feature.acceptanceCriteria.join("; ") || feature.description}`,
    ];
  }
  if (indonesian) {
    return [
      `Buka layar ${feature.name} setelah ${domain.actor.name} masuk.`,
      `Tampilkan data ${domain.record.name} yang relevan, termasuk state kosong.`,
      `Biarkan ${domain.actor.name} menyelesaikan ${feature.name} dalam beberapa klik.`,
      `Simpan hasilnya dan tampilkan konfirmasi.`,
      `Kalau gagal, pesan error harus jelas dan data yang sudah diisi tetap ada.`,
    ];
  }
  return [
    `Open the ${feature.name} screen after ${domain.actor.name} signs in.`,
    `Show the relevant ${domain.record.name} data, including an empty state.`,
    `Let ${domain.actor.name} finish ${feature.name} in a short path.`,
    `Save the result and show a confirmation.`,
    `If it fails, keep the entered data and show a recoverable error.`,
    feature.acceptanceCriteria.length
      ? `Acceptance:\n${feature.acceptanceCriteria.map((item) => `- ${item}`).join("\n")}`
      : "",
  ];
}

function jobFilename(job: GenerationJob): string {
  const slug = job.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${String(job.step).padStart(2, "0")}-${slug || "job"}.md`;
}

function renderJobsReadme(
  jobs: readonly GenerationJob[],
  projectName: string,
): string {
  const list = jobs
    .map((job) => `${job.step}. ${job.title} — ${job.summary}`)
    .join("\n");

  return [
    `# AI jobs for ${projectName}`,
    "",
    "Unzip this export into your project, open it in Cursor (or the tool you generated), then paste one job prompt at a time.",
    "",
    `This pack has ${String(jobs.length)} job${jobs.length === 1 ? "" : "s"} for this spec — not a fixed count.`,
    "",
    "Finish a job before starting the next one.",
    "",
    "## Order",
    "",
    list,
    "",
  ].join("\n");
}

function renderJobMarkdown(job: GenerationJob): string {
  return [`# Job ${String(job.step).padStart(2, "0")} — ${job.title}`, "", job.prompt, ""].join(
    "\n",
  );
}
