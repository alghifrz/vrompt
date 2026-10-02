import type { ProjectSpec } from "../schema/project-spec";

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
  readonly kind: "actor" | "subject" | "record";
}

export interface DomainModel {
  readonly language: SpecLanguage;
  readonly theme: "attendance" | "visit" | "generic";
  readonly actor: DomainNoun;
  readonly subject?: DomainNoun;
  readonly record: DomainNoun;
  readonly slug: string;
  readonly endpoints: readonly DomainEndpoint[];
}

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
  const indonesian = (
    text.match(
      /\b(yang|untuk|dengan|secara|tanpa|siswa|guru|kehadiran|pencatatan|aplikasi|setiap|hari|kelas|absen|hadir)\b/g,
    ) ?? []
  ).length;
  const english = (text.match(/\b(the|and|with|for|from|this|that|user|visit)\b/g) ?? []).length;
  return indonesian > english ? "id" : "en";
}

export function isPlaceholderEntityName(name: string): boolean {
  return /^(item|items|record|entity|data|main)$/i.test(name.trim());
}

export function isPlaceholderApiPath(path: string): boolean {
  return /^\/api\/items?$/i.test(path.trim());
}

export function buildDomainModel(spec: ProjectSpec): DomainModel {
  const language = specLanguage(spec);
  const text = specCorpus(spec);
  const theme = detectTheme(text);
  const actorName = spec.users?.[0]?.name ?? spec.project.targetUsers[0] ?? (language === "id" ? "Pengguna" : "User");
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

  if (theme === "attendance") {
    const subject: DomainNoun = {
      id: language === "id" ? "Siswa" : "Student",
      name: language === "id" ? "Siswa" : "Student",
      description:
        language === "id"
          ? "Siswa yang kehadirannya dicatat."
          : "The student whose attendance is recorded.",
      kind: "subject",
    };
    const record: DomainNoun = {
      id: language === "id" ? "Kehadiran" : "Attendance",
      name: language === "id" ? "Kehadiran" : "Attendance",
      description:
        language === "id"
          ? "Satu catatan kehadiran siswa pada suatu hari."
          : "One attendance mark for a student on a given day.",
      kind: "record",
    };
    const slug = language === "id" ? "kehadiran" : "attendance";
    return {
      language,
      theme,
      actor,
      subject,
      record,
      slug,
      endpoints: attendanceEndpoints(language, slug, subject.name.toLowerCase()),
    };
  }

  if (theme === "visit") {
    const record: DomainNoun = {
      id: "Visit",
      name: "Visit",
      description:
        language === "id"
          ? "Kunjungan atau jadwal yang dikelola di aplikasi."
          : "A scheduled visit the team manages.",
      kind: "record",
    };
    return {
      language,
      theme,
      actor,
      record,
      slug: "visits",
      endpoints: genericEndpoints(language, "visits", record.name),
    };
  }

  const fromFeature = spec.features?.[0]?.name;
  const recordName = nounFromFeature(fromFeature, spec.project.name, language);
  const record: DomainNoun = {
    id: nounId(recordName),
    name: recordName,
    description:
      spec.features?.[0]?.description ??
      (language === "id"
        ? `Data utama yang ${actor.name} buat dan tinjau.`
        : `The main record ${actor.name} creates and reviews.`),
    kind: "record",
  };
  const slug = slugify(recordName);
  return {
    language,
    theme: "generic",
    actor,
    record,
    slug,
    endpoints: genericEndpoints(language, slug, recordName),
  };
}

function detectTheme(text: string): DomainModel["theme"] {
  if (/absen|hadir|kehadiran|presensi|attendance/.test(text)) {
    return "attendance";
  }
  if (/visit|kunjungan|jadwal kunjung|dispatcher/.test(text)) {
    return "visit";
  }
  return "generic";
}

function attendanceEndpoints(
  language: SpecLanguage,
  recordSlug: string,
  subjectSlug: string,
): DomainEndpoint[] {
  if (language === "id") {
    return [
      {
        method: "GET",
        path: `/api/${subjectSlug}`,
        purpose: "Ambil daftar siswa untuk kelas hari ini.",
        authRequired: true,
      },
      {
        method: "GET",
        path: `/api/${recordSlug}`,
        purpose: "Lihat rekap kehadiran pada tanggal tertentu.",
        authRequired: true,
      },
      {
        method: "POST",
        path: `/api/${recordSlug}`,
        purpose: "Simpan status kehadiran siswa.",
        authRequired: true,
      },
    ];
  }

  return [
    {
      method: "GET",
      path: `/api/${subjectSlug}s`,
      purpose: "List students for today's class.",
      authRequired: true,
    },
    {
      method: "GET",
      path: `/api/${recordSlug}`,
      purpose: "Read attendance for a date.",
      authRequired: true,
    },
    {
      method: "POST",
      path: `/api/${recordSlug}`,
      purpose: "Save an attendance mark.",
      authRequired: true,
    },
  ];
}

function genericEndpoints(
  language: SpecLanguage,
  slug: string,
  recordName: string,
): DomainEndpoint[] {
  if (language === "id") {
    return [
      {
        method: "GET",
        path: `/api/${slug}`,
        purpose: `Lihat daftar ${recordName}.`,
        authRequired: true,
      },
      {
        method: "POST",
        path: `/api/${slug}`,
        purpose: `Buat ${recordName} baru.`,
        authRequired: true,
      },
    ];
  }

  return [
    {
      method: "GET",
      path: `/api/${slug}`,
      purpose: `List ${recordName} records.`,
      authRequired: true,
    },
    {
      method: "POST",
      path: `/api/${slug}`,
      purpose: `Create a ${recordName}.`,
      authRequired: true,
    },
  ];
}

function nounFromFeature(featureName: string | undefined, projectName: string, language: SpecLanguage): string {
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
