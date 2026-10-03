import type { Feature, ProjectSpec } from "../schema/project-spec";

export type SpecLanguage = "id" | "en";
export type DomainTheme = "attendance" | "visit" | "commerce" | "generic";

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
  readonly theme: DomainTheme;
  readonly actor: DomainNoun;
  readonly subject?: DomainNoun;
  readonly record: DomainNoun;
  readonly slug: string;
  readonly endpoints: readonly DomainEndpoint[];
  readonly features: readonly DomainFeature[];
  readonly entities: readonly DomainNoun[];
  readonly relationships: readonly DomainRelationship[];
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
      /\b(yang|untuk|dengan|secara|tanpa|siswa|guru|kehadiran|pencatatan|aplikasi|setiap|hari|kelas|absen|hadir|toko|buku|penjualan|pelanggan|stok|pembayaran)\b/g,
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
  const domain = buildDomainModel(spec);
  return domain.features.length >= 3 && (spec.features?.length ?? 0) < 3;
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
    [...(spec.users ?? []).map((user) => user.name), ...spec.project.targetUsers].map(
      normalizeName,
    ),
  );
  const copiedFeature = entities.some((entity) => featureNames.has(normalizeName(entity.name)));
  const onlyPeople =
    entities.length <= 2 &&
    entities.every(
      (entity) =>
        userNames.has(normalizeName(entity.name)) ||
        /penjual|pemilik|guru|user|owner|admin|dispatcher/i.test(entity.name),
    );

  if (copiedFeature || onlyPeople) {
    return true;
  }
  if (domain.theme === "commerce" && entities.length < 4) {
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
  const text = specCorpus(spec);
  const theme = detectTheme(text);
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

  if (theme === "attendance") {
    return attendanceModel(spec, language, actor);
  }
  if (theme === "visit") {
    return visitModel(spec, language, actor);
  }
  if (theme === "commerce") {
    return commerceModel(language, actor, text);
  }
  return genericModel(spec, language, actor);
}

function attendanceModel(
  spec: ProjectSpec,
  language: SpecLanguage,
  actor: DomainNoun,
): DomainModel {
  const subject: DomainNoun = {
    id: language === "id" ? "Siswa" : "Student",
    name: language === "id" ? "Siswa" : "Student",
    description:
      language === "id" ? "Siswa yang kehadirannya dicatat." : "The student whose attendance is recorded.",
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
    theme: "attendance",
    actor,
    subject,
    record,
    slug,
    endpoints: attendanceEndpoints(language, slug, subject.name.toLowerCase()),
    features: existingOr(
      spec.features,
      language === "id"
        ? [
            feature(
              "feature-absen",
              "Mengabsen Siswa",
              "Guru menandai hadir, izin, sakit, atau alpha untuk siswa hari ini.",
              "must",
              ["Guru bisa menyimpan absen satu kelas dalam satu layar."],
            ),
          ]
        : [
            feature(
              "feature-absen",
              "Mark attendance",
              "The teacher marks present, excused, sick, or absent for today's class.",
              "must",
              ["A teacher can save attendance for one class on one screen."],
            ),
          ],
    ),
    entities: [actor, subject, record],
    relationships: [
      rel(subject.name, record.name, language, "punya banyak", "has many"),
      rel(actor.name, record.name, language, "mencatat", "creates"),
    ],
  };
}

function visitModel(spec: ProjectSpec, language: SpecLanguage, actor: DomainNoun): DomainModel {
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
    theme: "visit",
    actor,
    record,
    slug: "visits",
    endpoints: genericEndpoints(language, "visits", record.name),
    features: existingOr(spec.features, [
      feature(
        "feature-board",
        language === "id" ? "Papan kunjungan" : "Visit board",
        language === "id" ? "Lihat kunjungan hari ini." : "Show today's visits.",
        "must",
        [language === "id" ? "Papan menampilkan kunjungan hari ini." : "The board lists today's visits."],
      ),
    ]),
    entities: [actor, record],
    relationships: [rel(actor.name, record.name, language, "mengelola", "manages")],
  };
}

function commerceModel(
  language: SpecLanguage,
  actor: DomainNoun,
  text: string,
): DomainModel {
  const id = language === "id";
  const bookish = /buku|book/.test(text);
  const product: DomainNoun = {
    id: bookish ? (id ? "Buku" : "Book") : id ? "Produk" : "Product",
    name: bookish ? (id ? "Buku" : "Book") : id ? "Produk" : "Product",
    description: bookish
      ? id
        ? "Buku yang dijual di toko."
        : "A book sold in the shop."
      : id
        ? "Barang yang dijual."
        : "An item sold in the shop.",
    kind: "subject",
  };
  const customer: DomainNoun = {
    id: id ? "Pelanggan" : "Customer",
    name: id ? "Pelanggan" : "Customer",
    description: id ? "Pembeli yang tercatat di toko." : "A buyer recorded by the shop.",
    kind: "supporting",
  };
  const order: DomainNoun = {
    id: id ? "Pesanan" : "Order",
    name: id ? "Pesanan" : "Order",
    description: id
      ? "Satu transaksi penjualan ke pelanggan."
      : "One sales transaction for a customer.",
    kind: "record",
  };
  const line: DomainNoun = {
    id: id ? "ItemPesanan" : "OrderItem",
    name: id ? "ItemPesanan" : "OrderItem",
    description: id
      ? `Baris ${product.name.toLowerCase()} di dalam pesanan.`
      : `A ${product.name.toLowerCase()} line inside an order.`,
    kind: "supporting",
  };
  const payment: DomainNoun = {
    id: id ? "Pembayaran" : "Payment",
    name: id ? "Pembayaran" : "Payment",
    description: /rekening|qr/.test(text)
      ? id
        ? "Pembayaran pesanan lewat rekening tetap atau kode QR."
        : "Payment of an order via a fixed account or QR code."
      : id
        ? "Pembayaran untuk sebuah pesanan."
        : "Payment recorded against an order.",
    kind: "supporting",
  };

  const paymentFeatureName = /rekening/.test(text)
    ? id
      ? "Pembayaran via Rekening Tetap"
      : "Pay via saved account"
    : id
      ? "Catat Pembayaran"
      : "Record payment";

  return {
    language,
    theme: "commerce",
    actor,
    subject: product,
    record: order,
    slug: id ? "pesanan" : "orders",
    endpoints: commerceEndpoints(language, product, order, payment),
    features: [
      feature(
        "feature-catalog",
        id ? `Kelola Katalog ${product.name}` : `Manage ${product.name} catalog`,
        id
          ? `Pemilik menambah, mengubah, dan mencari ${product.name.toLowerCase()} yang dijual.`
          : `The owner adds, edits, and searches ${product.name.toLowerCase()}s for sale.`,
        "must",
        [
          id
            ? `${product.name} baru bisa disimpan dan muncul di daftar.`
            : `A new ${product.name.toLowerCase()} can be saved and listed.`,
        ],
      ),
      feature(
        "feature-stock",
        id ? "Kelola Stok" : "Manage stock",
        id
          ? `Stok ${product.name.toLowerCase()} bisa ditambah atau dikurangi saat ada perubahan.`
          : `${product.name} stock can go up or down when inventory changes.`,
        "must",
        [id ? "Perubahan stok tersimpan dan terlihat di katalog." : "Stock changes are saved and visible."],
      ),
      feature(
        "feature-orders",
        id ? "Catat Penjualan" : "Record a sale",
        id
          ? "Pemilik mencatat pesanan, jumlah, dan total belanja pelanggan."
          : "The owner records an order, quantities, and the customer total.",
        "must",
        [id ? "Satu penjualan tersimpan beserta itemnya." : "One sale is saved with its line items."],
      ),
      feature(
        "feature-payment",
        paymentFeatureName,
        /rekening|qr/.test(text)
          ? id
            ? "Pelanggan membayar lewat nomor rekening tetap yang ditampilkan sebagai rekening atau kode QR."
            : "The customer pays through a fixed account number shown as text or a QR code."
          : id
            ? "Pemilik menandai pesanan sudah dibayar."
            : "The owner marks an order as paid.",
        "must",
        [
          id
            ? "Status pembayaran pesanan berubah setelah bukti atau konfirmasi disimpan."
            : "The order payment status updates after confirmation is saved.",
        ],
      ),
      feature(
        "feature-customers",
        id ? "Data Pelanggan" : "Customer records",
        id
          ? "Toko menyimpan nama dan kontak pelanggan yang berulang."
          : "The shop keeps names and contacts for returning customers.",
        "should",
        [id ? "Pelanggan bisa dipilih saat membuat pesanan." : "A customer can be picked when creating an order."],
      ),
    ],
    entities: [actor, product, customer, order, line, payment],
    relationships: [
      rel(actor.name, product.name, language, "mengelola", "manages"),
      rel(customer.name, order.name, language, "memesan", "places"),
      rel(order.name, line.name, language, "punya banyak", "has many"),
      rel(product.name, line.name, language, "muncul di", "appears in"),
      rel(order.name, payment.name, language, "punya", "has"),
    ],
  };
}

function genericModel(spec: ProjectSpec, language: SpecLanguage, actor: DomainNoun): DomainModel {
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
  const id = language === "id";
  return {
    language,
    theme: "generic",
    actor,
    record,
    slug,
    endpoints: genericEndpoints(language, slug, recordName),
    features: existingOr(spec.features, [
      feature(
        "feature-main",
        fromFeature ? titleCase(fromFeature) : id ? `Kelola ${recordName}` : `Manage ${recordName}`,
        spec.features?.[0]?.description ??
          (id
            ? `${actor.name} membuat dan meninjau ${recordName}.`
            : `${actor.name} creates and reviews ${recordName}.`),
        "must",
        [id ? `${recordName} bisa dibuat dan dilihat di aplikasi.` : `${recordName} can be created and viewed in-app.`],
      ),
    ]),
    entities: [actor, record],
    relationships: [rel(actor.name, record.name, language, "mencatat", "creates")],
  };
}

function detectTheme(text: string): DomainTheme {
  if (/absen|hadir|kehadiran|presensi|attendance/.test(text)) {
    return "attendance";
  }
  if (/visit|kunjungan|jadwal kunjung|dispatcher/.test(text)) {
    return "visit";
  }
  if (
    /toko|warung|buku|bookstore|shop|store|jual|stok|stock|pelanggan|katalog|pesanan|pembayaran|produk|inventory|checkout|rekening/.test(
      text,
    )
  ) {
    return "commerce";
  }
  return "generic";
}

function existingOr(
  features: readonly Feature[] | undefined,
  fallback: DomainFeature[],
): DomainFeature[] {
  if (features && features.length > 0) {
    return features.map((feature) => ({
      id: feature.id,
      name: feature.name,
      description: feature.description,
      priority: feature.priority,
      acceptance: feature.acceptanceCriteria,
    }));
  }
  return fallback;
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

function commerceEndpoints(
  language: SpecLanguage,
  product: DomainNoun,
  order: DomainNoun,
  payment: DomainNoun,
): DomainEndpoint[] {
  const productSlug = slugify(product.name);
  const orderSlug = slugify(order.name);
  const paymentSlug = slugify(payment.name);
  if (language === "id") {
    return [
      {
        method: "GET",
        path: `/api/${productSlug}`,
        purpose: `Ambil daftar ${product.name.toLowerCase()} dan stoknya.`,
        authRequired: true,
      },
      {
        method: "POST",
        path: `/api/${orderSlug}`,
        purpose: `Simpan ${order.name.toLowerCase()} baru.`,
        authRequired: true,
      },
      {
        method: "POST",
        path: `/api/${paymentSlug}`,
        purpose: `Catat ${payment.name.toLowerCase()} untuk sebuah pesanan.`,
        authRequired: true,
      },
    ];
  }
  return [
    {
      method: "GET",
      path: `/api/${productSlug}`,
      purpose: `List ${product.name.toLowerCase()}s and stock.`,
      authRequired: true,
    },
    {
      method: "POST",
      path: `/api/${orderSlug}`,
      purpose: `Create a ${order.name.toLowerCase()}.`,
      authRequired: true,
    },
    {
      method: "POST",
      path: `/api/${paymentSlug}`,
      purpose: `Record a ${payment.name.toLowerCase()}.`,
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
