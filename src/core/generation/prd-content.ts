import type { Feature, ProjectSpec } from "../schema/project-spec";
import { buildDomainModel, specLanguage, type DomainModel, type SpecLanguage } from "../spec/domain";
import { isSubjectPerson } from "../spec/lexicon";
import { buildExpertFields } from "./erd-fields";

export type FeatureKind = "capture" | "view" | "remind" | "manage";

export function featureKind(name: string): FeatureKind {
  if (/(lihat|view|list|board|daftar)/i.test(name)) {
    return "view";
  }
  if (/(ingat|remind|notif)/i.test(name)) {
    return "remind";
  }
  if (/(catat|record|absen|jual|bayar|simpan|pay|sell|stok|pesan)/i.test(name)) {
    return "capture";
  }
  return "manage";
}

export function inferredSuccessCriteria(spec: ProjectSpec): string[] {
  const language = specLanguage(spec);
  const actor = spec.users?.[0]?.name ?? spec.project.targetUsers[0] ?? "Pengguna";
  const features = (spec.features ?? []).filter((feature) => feature.priority !== "later");
  if (features.length === 0) {
    return [
      language === "id"
        ? `${actor} bisa menyelesaikan pekerjaan utama tanpa setup tambahan.`
        : `${actor} can complete the main job without extra setup.`,
    ];
  }

  return features.slice(0, 4).map((feature) =>
    language === "id"
      ? `${actor} dapat menyelesaikan ${feature.name} dan melihat hasilnya tersimpan.`
      : `${actor} can finish ${feature.name} and see the result saved.`,
  );
}

export function whyThisProduct(spec: ProjectSpec): string {
  const language = specLanguage(spec);
  const goal = spec.goals?.primary[0]?.statement;
  if (language === "id") {
    return goal
      ? `${spec.project.description.replace(/\.$/, "")}. Versi pertama ada untuk ${soften(goal)}.`
      : spec.project.description;
  }
  return goal
    ? `${spec.project.description.replace(/\.$/, "")}. The first version exists so that ${soften(goal)}.`
    : spec.project.description;
}

export function experienceNotes(spec: ProjectSpec): string[] {
  const language = specLanguage(spec);
  const actor = spec.users?.[0]?.name ?? spec.project.targetUsers[0] ?? (language === "id" ? "pengguna" : "the user");
  const jobs = (spec.features ?? [])
    .filter((feature) => feature.priority === "must")
    .map((feature) => feature.name)
    .slice(0, 3);
  const jobList = jobs.length > 0 ? jobs.join(", ") : spec.project.name;

  if (language === "id") {
    return [
      `- Layar pertama menjelaskan ${spec.project.name} kepada ${actor} dalam satu halaman.`,
      `- State kosong mengarahkan ${actor} ke pekerjaan berikutnya: ${jobList}.`,
      `- Pesan error bisa diperbaiki tanpa kehilangan data yang sudah diisi.`,
      `- Demo v1 cukup dari masuk sampai ${jobs[0] ?? "pekerjaan utama"} selesai.`,
    ];
  }

  return [
    `- First-run experience should explain ${spec.project.name} to ${actor} in one screen.`,
    `- Empty states should point ${actor} to the next job: ${jobList}.`,
    `- Errors should be recoverable without losing work.`,
    `- The v1 demo should go from sign-in to finishing ${jobs[0] ?? "the main job"}.`,
  ];
}

export function userStory(spec: ProjectSpec, feature: Pick<Feature, "name" | "description">): string {
  const language = specLanguage(spec);
  const actor = titleCase(
    spec.users?.[0]?.name ?? spec.project.targetUsers[0] ?? (language === "id" ? "Pengguna" : "the user"),
  );
  const outcome = storyOutcome(spec, feature, language);
  if (language === "id") {
    return `Sebagai ${actor}, saya ingin ${soften(feature.name)} supaya ${outcome}.`;
  }
  return `As ${actor}, I want to ${soften(feature.name)} so that ${outcome}.`;
}

export function featureAcceptance(
  spec: ProjectSpec,
  feature: Pick<Feature, "name" | "description"> & {
    readonly acceptanceCriteria: readonly string[];
  },
): string[] {
  if (feature.acceptanceCriteria.length > 0) {
    return [...feature.acceptanceCriteria];
  }

  const language = specLanguage(spec);
  const kind = featureKind(feature.name);
  const object = featureObject(feature.name);
  const fields = relatedFieldNames(spec, feature.name);

  if (language === "id") {
    const lines = [
      kind === "view"
        ? `${object} milik pengguna yang masuk bisa dilihat dalam daftar.`
        : kind === "remind"
          ? `Pengingat untuk ${object} bisa dijadwalkan dan terlihat di aplikasi.`
          : `${feature.name} menyimpan ${object} dan menampilkannya lagi setelah refresh.`,
    ];
    if (fields.includes("quantity")) {
      lines.push("Jumlah yang diisi tersimpan apa adanya.");
    }
    if (fields.includes("amount")) {
      lines.push("Nilai uang yang diisi tersimpan apa adanya.");
    }
    if (fields.some((name) => /At$/.test(name))) {
      lines.push("Waktu yang diisi terlihat di detail catatan.");
    }
    lines.push("Jika gagal, pesan kesalahan terlihat dan data yang sudah diisi tidak hilang.");
    return lines;
  }

  const lines = [
    kind === "view"
      ? `The signed-in user can see their ${object} list.`
      : kind === "remind"
        ? `A reminder for ${object} can be scheduled and seen in the app.`
        : `${feature.name} saves ${object} and shows it again after refresh.`,
  ];
  if (fields.includes("quantity")) {
    lines.push("The entered quantity is stored as typed.");
  }
  if (fields.includes("amount")) {
    lines.push("The entered amount is stored as typed.");
  }
  if (fields.some((name) => /At$/.test(name))) {
    lines.push("The entered time is visible on the record detail.");
  }
  lines.push("Failure states are visible and do not lose draft input.");
  return lines;
}

export function featureFlow(
  spec: ProjectSpec,
  feature: Pick<Feature, "name">,
  domain: DomainModel,
): string[] {
  const language = specLanguage(spec);
  const actor = domain.actor.name;
  const kind = featureKind(feature.name);
  const object = featureObject(feature.name);
  const fields = relatedFieldNames(spec, feature.name).filter((name) =>
    /^(quantity|amount|method|status|priority|channel)$/.test(name) || /At$/.test(name),
  );
  const fieldHint =
    fields.length > 0
      ? fields.map((name) => humanizeField(name, language)).join(", ")
      : undefined;

  if (language === "id") {
    if (kind === "view") {
      return [
        `- ${actor} masuk dan membuka daftar ${object}.`,
        `- ${actor} bisa menelusuri atau membuka satu ${object}.`,
        `- Sistem menampilkan data terbaru milik ${actor}.`,
      ];
    }
    if (kind === "remind") {
      return [
        `- ${actor} memilih ${object} yang relevan.`,
        `- ${actor} mengatur waktu${fieldHint ? ` dan ${fieldHint}` : ""} pengingat.`,
        `- Sistem menyimpan pengingat dan menampilkan konfirmasi.`,
      ];
    }
    return [
      `- ${actor} membuka form ${feature.name}.`,
      `- ${actor} mengisi ${fieldHint ?? object}.`,
      `- Sistem menyimpan hasilnya dan menampilkan ${object} di daftar.`,
    ];
  }

  if (kind === "view") {
    return [
      `- ${actor} signs in and opens the ${object} list.`,
      `- ${actor} can browse or open one ${object}.`,
      `- The app shows the latest rows that belong to ${actor}.`,
    ];
  }
  if (kind === "remind") {
    return [
      `- ${actor} picks the relevant ${object}.`,
      `- ${actor} sets the reminder time${fieldHint ? ` and ${fieldHint}` : ""}.`,
      `- The app saves the reminder and shows confirmation.`,
    ];
  }
  return [
    `- ${actor} opens the ${feature.name} form.`,
    `- ${actor} fills in ${fieldHint ?? object}.`,
    `- The app saves the result and shows ${object} in the list.`,
  ];
}

export function featureNotes(
  spec: ProjectSpec,
  feature: Pick<Feature, "name">,
  domain: DomainModel,
): string[] {
  const language = specLanguage(spec);
  const related = relatedEntities(domain, feature.name);
  const fields = relatedFieldNames(spec, feature.name).slice(0, 4);
  const model = related.join(", ") || [domain.actor.name, domain.record.name].join(", ");

  if (language === "id") {
    return [
      `- Kerjakan hanya **${feature.name}**. Jangan campur fitur berikutnya.`,
      `- Pakai model ${model}${fields.length ? ` dengan field ${fields.map((name) => humanizeField(name, language)).join(", ")}` : ""}.`,
      `- Jangan membuat entitas Item atau endpoint /api/items.`,
      `- Berhenti ketika kriteria penerimaan terpenuhi.`,
    ];
  }

  return [
    `- Implement only **${feature.name}**. Do not start the next feature.`,
    `- Reuse ${model}${fields.length ? ` with fields ${fields.map((name) => humanizeField(name, language)).join(", ")}` : ""}.`,
    `- Do not invent an Item entity or /api/items.`,
    `- Stop when the acceptance list is true.`,
  ];
}

export function journeyText(spec: ProjectSpec): string {
  const language = specLanguage(spec);
  const actor = spec.users?.[0]?.name ?? spec.project.targetUsers[0] ?? (language === "id" ? "Pengguna" : "the user");
  const jobs = (spec.features ?? []).slice(0, 3).map((feature) => feature.name);
  const path = jobs.length > 0 ? jobs.join(" → ") : language === "id" ? "pekerjaan utama" : "the main job";

  if (language === "id") {
    return `Sesi pertama yang wajar: ${actor} masuk, lalu menyelesaikan ${path}. Jika jalur itu tidak bisa, versi pertama belum selesai.`;
  }
  return `A typical first session: ${actor} signs in, then completes ${path}. If that path is not possible, the first version is not done.`;
}

export function openQuestions(spec: ProjectSpec): string[] {
  const language = specLanguage(spec);
  const questions: string[] = [];
  const later = (spec.features ?? []).filter((feature) => feature.priority !== "must");
  const hasRemind = (spec.features ?? []).some((feature) => featureKind(feature.name) === "remind");
  const hasPayment = (spec.features ?? []).some((feature) => /bayar|pembayaran|pay/i.test(feature.name));

  if (later.length > 0) {
    questions.push(
      language === "id"
        ? `Kalau v1 molor, tunda dulu: ${later.map((feature) => feature.name).join(", ")}?`
        : `If v1 slips, can these wait: ${later.map((feature) => feature.name).join(", ")}?`,
    );
  }
  if (hasRemind) {
    questions.push(
      language === "id"
        ? "Saluran pengingat mana yang wajib di versi pertama?"
        : "Which reminder channel is required in the first version?",
    );
  }
  if (hasPayment) {
    questions.push(
      language === "id"
        ? "Apakah pembayaran hanya dicatat, atau harus terhubung ke rekening sungguhan di v1?"
        : "Is payment only recorded in v1, or must it connect to a real account?",
    );
  }
  if (!spec.stack?.frontend && !spec.stack?.backend) {
    questions.push(
      language === "id"
        ? "Stack mana yang dipakai jika rekomendasi awal tidak cocok?"
        : "Which stack should replace the default if it does not fit?",
    );
  }
  if (questions.length === 0) {
    questions.push(
      language === "id"
        ? "Data apa yang tidak boleh keluar dari server?"
        : "What data must never leave the server?",
    );
  }
  return questions.map((item) => `- ${item}`);
}

function storyOutcome(
  spec: ProjectSpec,
  feature: Pick<Feature, "name" | "description">,
  language: SpecLanguage,
): string {
  const description = soften(feature.description);
  if (description && !isRestatement(description, feature.name)) {
    return description;
  }
  const problem = soften(spec.project.problem);
  if (problem) {
    return language === "id"
      ? `kondisi “${problem}” berkurang`
      : `the current pain (“${problem}”) is reduced`;
  }
  return language === "id" ? "pekerjaan utama selesai di aplikasi" : "the main job can be finished in-app";
}

function featureObject(name: string): string {
  const cleaned = name
    .replace(
      /^(catat|kelola|lihat|ingatkan|mengabsen|absen|jual|bayar|record|manage|view|remind)\s+/i,
      "",
    )
    .trim();
  return cleaned || name;
}

function isRestatement(description: string, featureName: string): boolean {
  const text = description.toLowerCase().replace(/\s+/g, " ").trim();
  const name = featureName.toLowerCase();
  const object = featureObject(featureName).toLowerCase();
  return text === name || text === object;
}

function relatedEntities(domain: DomainModel, featureName: string): string[] {
  const object = featureObject(featureName).toLowerCase();
  const names = domain.entities
    .map((entity) => entity.name)
    .filter((name) => {
      const key = name.toLowerCase();
      return object.includes(key) || key.includes(object.split(/\s+/)[0] ?? object);
    });
  const kind = featureKind(featureName);
  if ((kind === "capture" || kind === "remind") && domain.record && !names.includes(domain.record.name)) {
    names.push(domain.record.name);
  }
  if (names.length > 0) {
    return names.slice(0, 3);
  }
  return [domain.actor.name, domain.subject?.name, domain.record.name].filter(
    (item): item is string => Boolean(item),
  );
}

function relatedFieldNames(spec: ProjectSpec, featureName: string): string[] {
  const domain = buildDomainModel(spec);
  const names = relatedEntities(domain, featureName);
  const object = featureObject(featureName).toLowerCase();
  const kind = featureKind(featureName);
  const matched = domain.entities.find((entity) => {
    const key = entity.name.toLowerCase();
    return names.includes(entity.name) && (object.includes(key) || key.includes(object.split(/\s+/)[0] ?? object));
  });
  const noun =
    matched && !shouldPreferRecord(matched, kind)
      ? matched
      : domain.entities.find((entity) => names.includes(entity.name) && entity.kind === "record") ??
        domain.record;
  return buildExpertFields(noun, domain, spec)
    .map((field) => field.name)
    .filter(
      (name) =>
        !/^(id|createdAt|updatedAt|name|email|role|title|code)$/.test(name) && !name.endsWith("Id"),
    );
}

function shouldPreferRecord(
  noun: DomainModel["actor"],
  kind: FeatureKind,
): boolean {
  if (kind !== "capture" && kind !== "remind") {
    return false;
  }
  return noun.kind === "actor" || noun.kind === "subject" || isSubjectPerson(noun.name);
}

function humanizeField(name: string, language: SpecLanguage): string {
  const labels: Record<string, { id: string; en: string }> = {
    quantity: { id: "jumlah", en: "quantity" },
    amount: { id: "nilai", en: "amount" },
    method: { id: "metode", en: "method" },
    status: { id: "status", en: "status" },
    channel: { id: "saluran", en: "channel" },
    priority: { id: "prioritas", en: "priority" },
    markedAt: { id: "waktu absen", en: "marked time" },
    scheduledAt: { id: "waktu janji", en: "scheduled time" },
    dueAt: { id: "tenggat", en: "due time" },
    paidAt: { id: "waktu bayar", en: "paid time" },
    remindAt: { id: "waktu pengingat", en: "reminder time" },
  };
  const label = labels[name];
  return label ? (language === "id" ? label.id : label.en) : name;
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function soften(value: string): string {
  return value
    .replace(/^(fitur untuk|a feature to|the feature to|feature to|versi pertama membantu pengguna\s+)/i, "")
    .replace(/\.$/, "")
    .trim()
    .replace(/^([A-Z])/, (letter) => letter.toLowerCase());
}
