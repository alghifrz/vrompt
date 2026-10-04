/** Linguistic cues for interview interpretation. Not a product-domain catalog. */

export const ACTOR_TITLES = new Set([
  "admin",
  "dispatcher",
  "dokter",
  "guru",
  "kasir",
  "karyawan",
  "mahasiswa",
  "manager",
  "nurse",
  "owner",
  "parent",
  "pemilik",
  "pengguna",
  "penjaga",
  "penjual",
  "seller",
  "staff",
  "teacher",
  "technician",
  "user",
]);

export const SUBJECT_PEOPLE = new Set([
  "buyer",
  "customer",
  "murid",
  "pasien",
  "pelanggan",
  "siswa",
  "student",
]);

export const ROLE_WORDS = new Set([...ACTOR_TITLES, ...SUBJECT_PEOPLE, "orang"]);

export const JOB_VERBS = new Set([
  "absen",
  "assign",
  "atur",
  "bayar",
  "bikin",
  "buat",
  "catat",
  "help",
  "ingetin",
  "ingatkan",
  "jual",
  "keep",
  "kelola",
  "lacak",
  "lihat",
  "list",
  "make",
  "manage",
  "membayar",
  "mencatat",
  "mengabsen",
  "mengatur",
  "mengelola",
  "melihat",
  "melacak",
  "menjual",
  "menyimpan",
  "merekap",
  "ngecek",
  "ngelola",
  "ngatur",
  "ngingetin",
  "nyatet",
  "nyimpen",
  "pay",
  "pencatatan",
  "pengelolaan",
  "record",
  "remind",
  "rekap",
  "sell",
  "simpan",
  "track",
  "use",
  "view",
]);

export const METHOD_WORDS = new Set([
  "aja",
  "kali",
  "kode",
  "lewat",
  "melalui",
  "nomor",
  "pakai",
  "pake",
  "rekening",
  "tetap",
  "transfer",
  "via",
  "wa",
  "whatsapp",
]);

export const VENUE_WORDS = new Set([
  "class",
  "clinic",
  "kantor",
  "kelas",
  "klinik",
  "office",
  "school",
  "sekolah",
  "shop",
  "store",
  "toko",
  "warung",
]);

export const QUALITY_WORDS = new Set([
  "akurat",
  "cepat",
  "disiplin",
  "rapi",
  "structured",
  "terstruktur",
]);

export const PAIN_WORDS = new Set([
  "berantakan",
  "kacau",
  "kelewat",
  "keliatan",
  "manual",
  "ribet",
  "scattered",
  "susah",
  "sulit",
  "telat",
  "terlambat",
  "tertinggal",
]);

export const JUNK_NOUNS = new Set([
  "antrian",
  "idea",
  "ide",
  "kelewat",
  "keliatan",
  "main",
  "mudah",
  "orang",
  "pekerjaan",
  "proses",
  "sama",
  "semua",
  "tanpa",
  "telat",
  "utama",
  "yang",
]);

export function normalizeLexeme(value: string): string {
  return value.toLowerCase().replace(/nya$/i, "").trim();
}

export function isActorTitle(value: string): boolean {
  return ACTOR_TITLES.has(normalizeLexeme(value));
}

export function isSubjectPerson(value: string): boolean {
  return SUBJECT_PEOPLE.has(normalizeLexeme(value));
}

export function isRoleWord(value: string): boolean {
  return ROLE_WORDS.has(normalizeLexeme(value));
}

export function isSlangVerb(value: string): boolean {
  return /^(nyatet|nyimpen|ngatur|ngecek|ngelola|ingetin|ngingetin|nulis)$/i.test(
    normalizeLexeme(value),
  );
}

export function isJobVerb(value: string): boolean {
  const word = normalizeLexeme(value);
  return JOB_VERBS.has(word) || isSlangVerb(word) || /^(meng|mem|men|me|di|ber)[a-z]{3,}$/.test(word);
}

export function isMethodWord(value: string): boolean {
  return METHOD_WORDS.has(normalizeLexeme(value));
}

export function isVenueWord(value: string): boolean {
  return VENUE_WORDS.has(normalizeLexeme(value));
}

export function isQualityWord(value: string): boolean {
  return QUALITY_WORDS.has(normalizeLexeme(value));
}

export function isPainWord(value: string): boolean {
  return PAIN_WORDS.has(normalizeLexeme(value));
}

export function isJunkNoun(value: string): boolean {
  const word = normalizeLexeme(value);
  return (
    JUNK_NOUNS.has(word) ||
    isPainWord(word) ||
    isQualityWord(word) ||
    isMethodWord(word) ||
    isSlangVerb(word)
  );
}

export function isWorkNoun(value: string): boolean {
  const word = normalizeLexeme(value);
  if (word.length < 3) {
    return false;
  }
  if (isJunkNoun(word) || isJobVerb(word) || isActorTitle(word) || isVenueWord(word)) {
    return false;
  }
  return true;
}

export function looksLikeChattyLabel(text: string): boolean {
  return /\b(lewat|via|melalui|aja|kali|tetap aja|rekening tetap)\b/i.test(text);
}

export function looksLikeJunkLabel(text: string): boolean {
  const object = text.replace(/^(catat|kelola|lihat|record|manage|view|ingatkan|remind)\s+/i, "");
  return object.split(/\s+/).some((word) => isJunkNoun(word) || isSlangVerb(word));
}

/** English plurals only. Indonesian words like "tugas" must stay intact. */
export function singularizeNoun(value: string): string {
  const word = normalizeLexeme(value);
  if (word.length <= 4 || word.endsWith("ss") || /(as|us|is|os)$/.test(word)) {
    return word;
  }
  if (word.endsWith("s") && /^[a-z]+$/.test(word)) {
    return word.slice(0, -1);
  }
  return word;
}

export function rewriteNegations(text: string): string {
  return text
    .replace(/\b(ga|gak|nggak|enggak|tidak)\s+manual(\s+lagi)?\b/gi, "tanpa proses manual")
    .replace(/\b(no longer|not)\s+manual\b/gi, "without a manual process")
    .replace(/\b(ga|gak|nggak|enggak|tidak)\s+(ribet|kacau|berantakan|telat|kelewat)(\s+lagi)?\b/gi, " ");
}
