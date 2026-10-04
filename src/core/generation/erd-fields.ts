import type { ProjectSpec } from "../schema/project-spec";
import type { DomainModel, DomainNoun, SpecLanguage } from "../spec/domain";
import { isSubjectPerson } from "../spec/lexicon";

export interface ErdField {
  readonly type: string;
  readonly name: string;
  readonly key?: "PK" | "FK";
  readonly required?: boolean;
  readonly notes?: string;
}

export function buildExpertFields(
  noun: DomainNoun,
  domain: DomainModel,
  spec?: ProjectSpec,
): ErdField[] {
  const language = domain.language;
  const corpus = entityCorpus(noun, spec);
  const actorId = mermaidId(domain.actor.name);
  const fields: ErdField[] = [
    field("string", "id", {
      key: "PK",
      notes: language === "id" ? `Kunci utama ${noun.name}.` : `Primary key for ${noun.name}.`,
    }),
  ];

  if (noun.kind === "actor") {
    fields.push(
      field("string", "name", {
        notes: language === "id" ? `Nama lengkap ${noun.name.toLowerCase()}.` : "Display name.",
      }),
      field("string", "email", {
        notes: language === "id" ? "Email untuk masuk." : "Unique sign-in email.",
      }),
      field("string", "role", {
        notes: language === "id" ? "Peran di aplikasi." : "Application role.",
      }),
    );
  } else if (isPersonNoun(noun)) {
    fields.push(
      field("string", "name", {
        notes: language === "id" ? `Nama ${noun.name.toLowerCase()}.` : `${noun.name} display name.`,
      }),
      field("string", "code", {
        required: false,
        notes:
          language === "id"
            ? `Kode atau nomor identitas ${noun.name.toLowerCase()}.`
            : `Optional identity code for this ${noun.name}.`,
      }),
    );
  } else if (noun.kind === "subject" || noun.kind === "supporting") {
    fields.push(
      field("string", "name", {
        notes: language === "id" ? `Nama ${noun.name.toLowerCase()}.` : `${noun.name} display name.`,
      }),
    );
  } else {
    const subject = domain.subject;
    if (subject && mermaidId(subject.name) !== mermaidId(noun.name)) {
      fields.push(
        field("string", `${lowerFirst(mermaidId(subject.name))}Id`, {
          key: "FK",
          notes:
            language === "id"
              ? `Mengacu ke ${mermaidId(subject.name)}.id.`
              : `References ${mermaidId(subject.name)}.id.`,
        }),
      );
    }
    if (mermaidId(noun.name) !== actorId) {
      fields.push(
        field("string", `${lowerFirst(actorId)}Id`, {
          key: "FK",
          notes:
            language === "id"
              ? `Mengacu ke ${actorId}.id.`
              : `References ${actorId}.id.`,
        }),
      );
    }
  }

  fields.push(...cueFields(noun, domain, corpus, language));

  if (
    noun.kind === "record" &&
    !fields.some((item) => /^(name|title|quantity|amount|body)$/.test(item.name))
  ) {
    fields.push(
      field("string", "title", {
        notes: language === "id" ? "Label singkat di daftar." : "Short label shown in lists.",
      }),
    );
  }

  if (noun.kind === "record" && !fields.some((item) => item.name === "status")) {
    fields.push(
      field("string", "status", {
        notes:
          language === "id"
            ? `Status ${noun.name.toLowerCase()}.`
            : `${noun.name} status.`,
      }),
    );
  }

  fields.push(
    field("datetime", "createdAt", {
      notes: language === "id" ? "Waktu baris dibuat." : "Row created at.",
    }),
    field("datetime", "updatedAt", {
      notes: language === "id" ? "Waktu terakhir diubah." : "Last update time.",
    }),
  );

  return uniqueFields(fields);
}

function cueFields(
  noun: DomainNoun,
  domain: DomainModel,
  corpus: string,
  language: SpecLanguage,
): ErdField[] {
  const name = noun.name.toLowerCase();
  const text = `${name} ${corpus}`.toLowerCase();
  const extras: ErdField[] = [];
  const hasStockTable = domain.entities.some(
    (entity) =>
      /stok|stock|inventory/i.test(entity.name) &&
      mermaidId(entity.name) !== mermaidId(noun.name),
  );

  if (/stok|stock|inventory|qty|jumlah/i.test(name)) {
    extras.push(
      field("number", "quantity", {
        notes: language === "id" ? "Jumlah yang tersimpan." : "Stored countable amount.",
      }),
    );
  } else if (
    noun.kind === "subject" &&
    !hasStockTable &&
    /stok|stock|inventory|jumlah/i.test(text)
  ) {
    extras.push(
      field("number", "quantity", {
        notes: language === "id" ? "Jumlah yang tersedia." : "Available countable amount.",
      }),
    );
  }

  if (/pembayaran|payment|bayar/i.test(name)) {
    extras.push(
      field("number", "amount", {
        notes: language === "id" ? "Nilai uang yang dibayar." : "Money value that was paid.",
      }),
      field("datetime", "paidAt", {
        notes: language === "id" ? "Kapan pembayaran dicatat." : "When the payment was recorded.",
      }),
    );
    if (/rekening|transfer|via|lewat|method|channel|wa|whatsapp/i.test(text)) {
      extras.push(
        field("string", "method", {
          notes:
            language === "id"
              ? "Cara bayar yang disebut di wawancara, misalnya rekening."
              : "Payment method mentioned in the interview.",
        }),
      );
    }
  } else if (/penjualan|sale|order|pesanan/i.test(name)) {
    extras.push(
      field("number", "quantity", {
        notes: language === "id" ? "Jumlah yang terjual." : "Quantity sold.",
      }),
      field("number", "amount", {
        notes: language === "id" ? "Nilai transaksi." : "Transaction amount.",
      }),
      field("datetime", "soldAt", {
        notes: language === "id" ? "Kapan penjualan terjadi." : "When the sale happened.",
      }),
    );
  } else if (/harga|amount|price/i.test(name)) {
    extras.push(
      field("number", "amount", {
        notes: language === "id" ? "Nilai uang." : "Money value in the project currency.",
      }),
    );
  }

  if (/janji|jadwal|appointment|schedule|visit|kunjung/i.test(name)) {
    extras.push(
      field("datetime", "scheduledAt", {
        notes: language === "id" ? "Waktu yang dijadwalkan." : "When this is scheduled.",
      }),
    );
  }

  if (/kehadiran|attendance|absen/i.test(name)) {
    extras.push(
      field("datetime", "markedAt", {
        notes: language === "id" ? "Kapan kehadiran dicatat." : "When attendance was marked.",
      }),
    );
  }

  if (/deadline|due/i.test(name) || (/tugas|task/i.test(name) && /deadline|due/i.test(text))) {
    extras.push(
      field("datetime", "dueAt", {
        notes: language === "id" ? "Batas waktu pengerjaan." : "When this is due.",
      }),
    );
  }

  if (/tugas|task/i.test(name)) {
    extras.push(
      field("string", "title", {
        notes: language === "id" ? "Judul pekerjaan." : "Task title.",
      }),
      field("string", "priority", {
        required: false,
        notes: language === "id" ? "Urutan pengerjaan, jika dipakai." : "Optional priority.",
      }),
    );
  }

  if (/habit|streak/i.test(name)) {
    extras.push(
      field("string", "title", {
        notes: language === "id" ? "Nama kebiasaan." : "Habit label.",
      }),
      field("number", "currentCount", {
        required: false,
        notes: language === "id" ? "Hitungan beruntun saat ini." : "Current streak or count.",
      }),
      field("datetime", "lastDoneAt", {
        required: false,
        notes: language === "id" ? "Kapan terakhir diselesaikan." : "When it was last completed.",
      }),
    );
  }

  if (/ingat|remind|notif/i.test(name)) {
    extras.push(
      field("datetime", "remindAt", {
        notes: language === "id" ? "Kapan pengingat dikirim." : "When the reminder should fire.",
      }),
      field("string", "channel", {
        required: false,
        notes:
          language === "id"
            ? "Saluran pengingat yang disebut di wawancara."
            : "Reminder channel mentioned in the interview.",
      }),
    );
  }

  if (/session|auth/i.test(name) && !/author/i.test(name)) {
    extras.push(
      field("string", "userId", {
        key: "FK",
        notes:
          language === "id"
            ? `Mengacu ke ${mermaidId(domain.actor.name)}.id.`
            : `References ${mermaidId(domain.actor.name)}.id.`,
      }),
      field("datetime", "expiresAt", {
        notes: language === "id" ? "Kapan sesi tidak berlaku." : "When the session stops being valid.",
      }),
    );
  }

  if (/note|catatan|comment|message/i.test(name) || (/catat/i.test(text) && noun.kind === "record" && /note/i.test(name))) {
    extras.push(
      field("text", "body", {
        notes: language === "id" ? "Isi tulisan utama." : "Main written content.",
      }),
    );
  }

  return extras;
}

function entityCorpus(noun: DomainNoun, spec?: ProjectSpec): string {
  if (!spec) {
    return noun.description;
  }
  const needle = noun.name.toLowerCase();
  return [
    noun.description,
    spec.project.description,
    spec.project.problem,
    ...(spec.goals?.primary.map((goal) => goal.statement) ?? []),
    ...(spec.features ?? [])
      .filter((feature) => `${feature.name} ${feature.description}`.toLowerCase().includes(needle))
      .flatMap((feature) => [feature.name, feature.description, ...feature.acceptanceCriteria]),
  ].join(" ");
}

function isPersonNoun(noun: DomainNoun): boolean {
  return (
    isSubjectPerson(noun.name) ||
    (noun.kind === "subject" &&
      /pasien|siswa|student|customer|pelanggan|murid|buyer/i.test(noun.name))
  );
}

function field(
  type: string,
  name: string,
  extra: { key?: ErdField["key"]; required?: boolean; notes?: string } = {},
): ErdField {
  return {
    type,
    name,
    required: extra.required ?? true,
    ...(extra.key ? { key: extra.key } : {}),
    ...(extra.notes ? { notes: extra.notes } : {}),
  };
}

function uniqueFields(fields: ErdField[]): ErdField[] {
  const seen = new Set<string>();
  return fields.filter((item) => {
    if (seen.has(item.name)) {
      return false;
    }
    seen.add(item.name);
    return true;
  });
}

function mermaidId(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9]+/g, "") || "Entity";
  return /^[A-Za-z]/.test(cleaned) ? cleaned : `E${cleaned}`;
}

function lowerFirst(value: string): string {
  return value ? value[0]!.toLowerCase() + value.slice(1) : value;
}
