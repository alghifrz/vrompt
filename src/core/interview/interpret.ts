import {
  isActorTitle,
  isJobVerb,
  isJunkNoun,
  isMethodWord,
  isPainWord,
  isQualityWord,
  isRoleWord,
  isSlangVerb,
  isVenueWord,
  isSubjectPerson,
  isWorkNoun,
  looksLikeJunkLabel,
  rewriteNegations,
} from "../spec/lexicon";

export type AnswerLanguage = "id" | "en";

const FILLERS =
  /\b(gw|gue|gua|aku|saya|banget|gitu|kek|kayak|sih|deh|dong|wkwk|aja|kali|ya|yah|trus|terus|jadi|biar|supaya|namanya|punya|pengen|ingin|mau|bikin|buat|ga|gak|nggak|enggak|the|a|an|sama)\b/gi;

const META =
  /\b(aplikasi|application|app|sistem|system|web|software|website|platform|tools?|produk|product|project|ide|idea)\b/gi;

const FIRST_PERSON =
  /\b(gw|gue|gua|aku|saya|i want|i need|i'm|im gonna|we want|we need|mau bikin|mau buat|pengen bikin)\b/i;

const NAME_NOISE = /^(kacau|berantakan|jelek|buruk|ribet|susah|banget|manual|digital)$/i;

const JOB_PAIR =
  /\b((?:catat|mencatat|kelola|mengelola|absen|mengabsen|manage|record|track|jual|menjual|bayar|membayar|nyatet|ingetin|ngingetin|remind)\s+[a-z]{3,}(?:\s+(?:sama|dan|and|,)\s+[a-z]{3,})*)\b/gi;

export function detectAnswerLanguage(text: string): AnswerLanguage {
  const indonesian = (
    text.match(
      /\b(yang|untuk|dengan|aplikasi|dari|mau|bikin|jadi|dan|atau|masih|ini|itu|ada|sudah|bisa|ke|di|pagi|buku|baca|bangun|saya|aku|kamu|kita|pengguna|pemilik|penjaga|biar|supaya|jadwal|pasien|tugas|kuliah|mahasiswa|dokter|klinik|rapi|deadline)\b/gi,
    ) ?? []
  ).length;
  const english = (text.match(/\b(the|and|with|for|from|this|that|want|need|app|users|help)\b/gi) ?? [])
    .length;
  if (indonesian === 0 && english === 0) {
    return /nya\b|lah\b|kah\b|[àéíóú]/i.test(text) ? "id" : "en";
  }
  return indonesian >= english ? "id" : "en";
}

export function looksLikeRawChat(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (FIRST_PERSON.test(trimmed)) {
    return true;
  }
  if (/\b(gw|gue|gua|wkwk|banget|gitu|kek|kayak|sih|deh|dong|namanya|pengen)\b/i.test(trimmed)) {
    return true;
  }
  if (/^(jadi|so|well|hmm|mau|ingin)\b/i.test(trimmed)) {
    return true;
  }
  return false;
}

export function looksLikeSpokenName(name: string): boolean {
  if (looksLikeRawChat(name)) {
    return true;
  }
  if (name.trim().split(/\s+/).length > 4) {
    return true;
  }
  if (/\b(namanya|aplikasi untuk|i want|mau bikin|called)\b/i.test(name)) {
    return true;
  }
  return name.length > 24 && /[,;]/.test(name);
}

export function looksLikeActorName(name: string): boolean {
  const words = name.trim().split(/\s+/);
  return words.length >= 2 && isRoleWord(words[0] ?? "");
}

function titleCaseKeepCaps(value: string): string {
  const trimmed = value.trim();
  if (/[A-Z]/.test(trimmed) && /[a-z]/.test(trimmed) && !/\s/.test(trimmed)) {
    return trimmed;
  }
  return trimmed
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function asSentence(text: string): string {
  const next = text.trim().replace(/\s+/g, " ");
  if (!next) {
    return next;
  }
  const capped = next.charAt(0).toUpperCase() + next.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

function stripFillers(text: string): string {
  return rewriteNegations(text)
    .replace(FILLERS, " ")
    .replace(/\s+,/g, ",")
    .replace(/,+/g, ",")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulWords(text: string, options?: { allowRoles?: boolean }): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const raw of stripFillers(text)
    .replace(META, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)) {
    const word = raw.replace(/nya$/i, "").trim();
    const key = word.toLowerCase();
    if (
      word.length <= 1 ||
      isJobVerb(word) ||
      isSlangVerb(word) ||
      isMethodWord(word) ||
      isJunkNoun(word) ||
      isPainWord(word) ||
      NAME_NOISE.test(word) ||
      (!options?.allowRoles && isActorTitle(word)) ||
      seen.has(key)
    ) {
      continue;
    }
    seen.add(key);
    words.push(word);
  }
  return words;
}

function stripName(text: string, name: string): string {
  if (!name) {
    return text;
  }
  return text.replace(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "ig"), " ").trim();
}

export function extractActorName(answer: string): string | undefined {
  const match = answer.match(
    /\b(pemilik|penjaga|kasir|guru|dokter|owner|teacher|dispatcher|penjual|pelanggan|mahasiswa)\s+([a-z\u00C0-\u024F]+(?:\s+[a-z\u00C0-\u024F]+){0,3})/i,
  );
  if (!match?.[1] || !match[2]) {
    return undefined;
  }
  const complement = match[2]
    .split(/[,\n]|(?=\b(?:catat|mencatat|kelola|mengelola|biar|supaya|buat|untuk)\b)/i)[0]
    ?.replace(/\b(kek|kayak|saya|gw|gue|aku)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!complement) {
    return titleCaseKeepCaps(match[1]);
  }
  return titleCaseKeepCaps(`${match[1]} ${complement}`);
}

function placeFromAnswer(answer: string): string | undefined {
  const afterIntent = answer.match(
    /\b(?:buat|untuk|for)\s+(.+?)(?:,|\.|$|\b(?:catat|mencatat|kelola|mengelola|biar|supaya)\b)/i,
  );
  const raw = afterIntent?.[1] ?? extractActorName(answer);
  if (!raw) {
    return undefined;
  }
  const words = raw
    .replace(/[^\p{L}\s-]/gu, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 1 &&
        !isActorTitle(word) &&
        !isJobVerb(word) &&
        !isSlangVerb(word) &&
        !isJunkNoun(word) &&
        !isMethodWord(word),
    );
  if (words.length === 0) {
    return undefined;
  }
  return titleCaseKeepCaps(words.slice(0, 3).join(" "));
}

const TOKEN_SKIP = new Set([
  "aplikasi",
  "application",
  "app",
  "nama",
  "namanya",
  "sama",
  "dan",
  "and",
  "atau",
  "buat",
  "untuk",
  "for",
  "biar",
  "supaya",
  "agar",
]);

const WEAK_COMPOUND_SECONDS = new Set(["temu", "tracker"]);

function jobObjects(answer: string): string[] {
  const objects: string[] = [];
  const seen = new Set<string>();
  const add = (value: string) => {
    const word = value.toLowerCase().replace(/nya$/i, "").trim();
    if (
      word.length < 3 ||
      TOKEN_SKIP.has(word) ||
      isJobVerb(word) ||
      isMethodWord(word) ||
      isActorTitle(word) ||
      (isJunkNoun(word) && !word.includes(" ")) ||
      seen.has(word)
    ) {
      return;
    }
    seen.add(word);
    objects.push(word);
  };

  const compact = () => {
    const longerFirst = [...objects].sort((left, right) => right.length - left.length);
    const kept: string[] = [];
    for (const item of longerFirst) {
      if (kept.some((existing) => existing.includes(item))) {
        continue;
      }
      kept.push(item);
    }
    objects.splice(0, objects.length, ...kept.reverse());
  };

  for (const match of answer.toLowerCase().matchAll(JOB_PAIR)) {
    const phrase = match[1] ?? "";
    const parts = phrase.split(/\s+(?:sama|dan|and|,)\s+|\s+/).slice(1);
    for (const part of parts) {
      add(part);
    }
  }

  const via = answer.match(/\b([a-z]{4,})\s+(?:lewat|via|melalui)\b/i);
  if (via?.[1]) {
    add(via[1]);
  }

  const tokens = answer
    .toLowerCase()
    .replace(/[^\p{L}\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const first = tokens[index] ?? "";
    const second = tokens[index + 1] ?? "";
    if (TOKEN_SKIP.has(first) || TOKEN_SKIP.has(second)) {
      continue;
    }
    const compound =
      isWorkNoun(first) &&
      !isSubjectPerson(first) &&
      (isWorkNoun(second) || WEAK_COMPOUND_SECONDS.has(second));
    if (compound) {
      add(`${first} ${second}`);
      index += 1;
    }
  }

  for (const token of tokens) {
    if (isSubjectPerson(token)) {
      add(token);
    }
  }

  compact();
  return objects;
}

function joinList(items: string[], language: AnswerLanguage): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  const conjunction = language === "id" ? "dan" : "and";
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items.at(-1)}`;
}

export function interpretProductName(answer: string): string {
  const quoted = answer.match(/["“]([^"”]{2,40})["”]/);
  if (quoted?.[1]) {
    return titleCaseKeepCaps(quoted[1]);
  }

  const hinted = answer.match(
    /(?:namanya|named|called|sebut(?:nya)?)\s+["']?([A-Za-z][\w-]{1,32})["']?/i,
  );
  if (hinted?.[1]) {
    return titleCaseKeepCaps(hinted[1]);
  }

  const camel = answer.match(/\b([A-Z][a-z]+[A-Z][A-Za-z0-9]+)\b/);
  if (camel?.[1]) {
    return camel[1];
  }

  const objects = jobObjects(answer);
  const compound = objects.find((item) => item.includes(" "));
  const place = placeFromAnswer(answer);
  if (place) {
    const words = place.split(/\s+/);
    if (words.length === 1 && isVenueWord(place)) {
      if (compound) {
        return titleCaseKeepCaps(compound);
      }
      if (objects.length > 0) {
        const language = detectAnswerLanguage(answer);
        return language === "id" ? `Catatan ${place}` : `${place} Notes`;
      }
    }
    return place;
  }

  const words = meaningfulWords(answer);
  if (words.length === 0) {
    return titleCaseKeepCaps(answer.split(/[,.!?]/)[0] ?? answer).slice(0, 32);
  }
  if (
    words.length === 1 &&
    isVenueWord(words[0] ?? "") &&
    /\b(catat|pencatatan|record|stok|penjualan|manage|track)\b/i.test(answer)
  ) {
    const language = detectAnswerLanguage(answer);
    const venue = titleCaseKeepCaps(words[0] ?? "");
    return language === "id" ? `Catatan ${venue}` : `${venue} Notes`;
  }
  return words.slice(0, 3).map((word) => titleCaseKeepCaps(word)).join(" ");
}

export function interpretDescription(
  answer: string,
  name: string,
  language: AnswerLanguage,
): string {
  const objects = jobObjects(answer);
  const place = placeFromAnswer(answer);
  const placeClause =
    place &&
    normalizeCompare(place) !== normalizeCompare(name) &&
    !objects.some((item) => place.toLowerCase().includes(item))
      ? place.toLowerCase()
      : undefined;

  if (objects.length > 0) {
    const listed = joinList(objects, language);
    if (language === "id") {
      return asSentence(
        placeClause
          ? `Aplikasi untuk mencatat ${listed} di ${placeClause}`
          : `Aplikasi untuk mencatat ${listed}`,
      );
    }
    return asSentence(
      placeClause
        ? `An application to record ${listed} for ${placeClause}`
        : `An application to record ${listed}`,
    );
  }

  const idea = meaningfulWords(stripName(answer, name)).join(" ");
  if (language === "id") {
    if (/^aplikasi\b/i.test(idea)) {
      return asSentence(idea);
    }
    return asSentence(idea ? `Aplikasi untuk ${idea}` : `Aplikasi ${name}`);
  }
  if (/^(an?|the)\s+/i.test(idea)) {
    return asSentence(idea);
  }
  return asSentence(idea ? `An application for ${idea}` : `${name} is a web application`);
}

export function interpretProblem(
  answer: string,
  description: string,
  language: AnswerLanguage,
): string {
  const rewritten = rewriteNegations(answer);
  const pain = rewritten.match(
    /\b(ribet|kacau|berantakan|manual|susah|sulit|scattered|messy|hard|disorganized|tanpa proses)\w*\b/i,
  );
  const objects = jobObjects(answer);
  const focus = objects.length > 0 ? joinList(objects, language) : undefined;
  const professional =
    pain?.[1]?.toLowerCase() === "ribet"
      ? "rumit"
      : pain?.[1]?.toLowerCase() === "kacau"
        ? "berantakan"
        : pain?.[1]?.toLowerCase() === "tanpa proses"
          ? "manual"
          : pain?.[1]?.toLowerCase();

  if (language === "id") {
    const next = asSentence(
      focus
        ? `Pencatatan ${focus} masih ${professional ?? "manual"} dan sulit dilacak`
        : professional
          ? `Proses saat ini masih ${professional} dan sulit dilacak`
          : "Pekerjaan masih dicatat secara manual dan mudah tertinggal",
    );
    return next === description
      ? asSentence("Kondisi saat ini masih manual dan sulit dilacak")
      : next;
  }

  const next = asSentence(
    focus
      ? `${titleCaseKeepCaps(focus)} is still ${professional ?? "manual"} and hard to track`
      : professional
        ? `The current process is still ${professional} and hard to track`
        : "The current process is still manual and easy to lose track of",
  );
  return next === description
    ? asSentence("The current situation is still manual and hard to track")
    : next;
}

export function interpretGoal(answer: string, language: AnswerLanguage): string {
  const rewritten = rewriteNegations(answer);
  const withoutManual = /tanpa proses|without a manual process/i.test(rewritten);
  const stripped = stripFillers(rewritten);
  const items = stripped
    .split(/,| dan | and /i)
    .map((item) => item.replace(/tanpa proses \w+/gi, "").trim())
    .filter(Boolean);
  const quality = items.map((item) => item.split(/\s+/).find((word) => isQualityWord(word))).find(Boolean);
  const objects = items.flatMap((item) =>
    item
      .split(/\s+/)
      .map((word) => word.replace(/nya$/i, ""))
      .filter(
        (word) =>
          word.length >= 3 &&
          !isQualityWord(word) &&
          !isJobVerb(word) &&
          !isMethodWord(word) &&
          !isJunkNoun(word) &&
          !isPainWord(word) &&
          !/^(yang|untuk|dengan|proses|tanpa)$/i.test(word),
      ),
  );
  const uniqueObjects = [...new Set(objects)].slice(0, 3);
  const looksLikeActions = items.every((item) => isJobVerb(item.split(/\s+/)[0] ?? "") || /^(bangun|baca|olahraga)\b/i.test(item));

  if (uniqueObjects.length > 0 && !looksLikeActions) {
    const listed = joinList(uniqueObjects, language);
    if (language === "id") {
      return asSentence(
        `Versi pertama membantu pengguna mencatat ${listed}${quality ? ` secara ${quality}` : ""}${
          withoutManual ? ", tanpa proses manual" : ""
        }`,
      );
    }
    return asSentence(
      `The first version helps users record ${listed}${quality ? ` in a ${quality} way` : ""}${
        withoutManual ? ", without a manual process" : ""
      }`,
    );
  }

  const joined =
    items.length > 1
      ? items.slice(0, -1).join(", ") + (language === "id" ? ", dan " : ", and ") + items.at(-1)
      : stripped;
  const body = joined || (language === "id" ? "menyelesaikan pekerjaan utama" : "complete the core job");
  const needsVerb =
    !looksLikeActions && !/\b(mencatat|mengelola|membantu|catat|kelola|record|track|manage|help|pencatatan)\b/i.test(body);
  if (language === "id") {
    return asSentence(`Versi pertama membantu pengguna ${needsVerb ? `mencatat ${body}` : body}`);
  }
  return asSentence(`The first version helps users ${needsVerb ? `record ${body}` : body}`);
}

export function interpretUser(answer: string, language: AnswerLanguage): {
  name: string;
  description: string;
  goals: string[];
} {
  const actor = extractActorName(answer);
  const words = meaningfulWords(answer, { allowRoles: true }).filter(
    (word) => !isJunkNoun(word) && word.toLowerCase() !== "orang",
  );
  const fallback = language === "id" ? "Pengguna utama" : "Primary user";
  const name = actor
    ? actor
    : words.length > 0
      ? words.slice(0, 3).map((word) => titleCaseKeepCaps(word)).join(" ")
      : fallback;
  const cleanedName =
    /^orang\b/i.test(name) || looksLikeJunkLabel(name) ? fallback : name;
  return {
    name: cleanedName,
    description:
      language === "id"
        ? asSentence(`${cleanedName} yang memakai aplikasi ini`)
        : asSentence(`${cleanedName} who uses this application`),
    goals: [
      language === "id"
        ? asSentence(`Memakai aplikasi untuk pekerjaan utamanya`)
        : asSentence(`Use the application for the main job`),
    ],
  };
}

export function interpretDiscovery(answer: string): {
  name: string;
  description: string;
  problem: string;
  targetUsers: string[];
  type: "web application";
} {
  const language = detectAnswerLanguage(answer);
  const name = interpretProductName(answer);
  const description = interpretDescription(answer, name, language);
  const actor = extractActorName(answer);
  return {
    name,
    description,
    problem: interpretProblem(answer, description, language),
    targetUsers: [actor ?? (language === "id" ? "Pengguna utama" : "Primary users")],
    type: "web application",
  };
}

function normalizeCompare(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
