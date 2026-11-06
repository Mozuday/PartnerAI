
export type ResponseLanguage =
  | "English"
  | "Hindi"
  | "Hinglish"
  | "Other";

const HINGLISH_WORDS = new Set([
  "hai", "hain", "ho", "tha", "thi", "the",
  "ka", "ki", "ke", "ko", "kya", "kaise",
  "kyun", "kyon", "kyu", "mujhe", "mujhko",
  "mera", "meri", "mere", "hum", "humara",
  "hamara", "aap", "aapko", "apka", "apki",
  "apke", "tum", "tumhe", "tumhara", "tera",
  "teri", "tere", "yeh", "yah", "woh", "wo",
  "iska", "iske", "iski", "uska", "uske", "uski",
  "se", "mein", "me", "par", "pe", "aur", "lekin",
  "nahi", "nahin", "ni", "mat", "bhi", "toh", "to",
  "ab", "kab", "kahan", "kidhar", "kaun", "kyunki",
  "kar", "karo", "karna", "karen", "karein",
  "karta", "karti", "karte", "kiya", "kiye",
  "chahiye", "batao", "bataiye", "samjhao",
  "samjhaiye", "samjha", "samajh", "dikhao",
  "likho", "banao", "bhejo", "de do", "mil",
  "acha", "accha", "theek", "thik", "haan", "han",
  "naya", "nayi", "kaam", "kaam", "wala", "wali",
  "wala", "liye", "liye", "raha", "rahi", "rahe",
  "sakta", "sakti", "sakte", "chalo", "jaldi",
  "please", "kardo", "krdo", "krna", "btao",
]);

function tokenizeLatin(text: string): string[] {
  return (
    text.toLowerCase().match(/[a-z]+/g) ?? []
  );
}

export function detectResponseLanguage(
  text: string
): ResponseLanguage {
  const trimmed = text.trim();

  if (!trimmed) {
    return "English";
  }

  const devanagariMatches =
    trimmed.match(/[\u0900-\u097F]/g) ?? [];

  const latinMatches =
    trimmed.match(/[A-Za-z]/g) ?? [];

  const devanagariCount = devanagariMatches.length;
  const latinCount = latinMatches.length;

  // Hindi written primarily in Devanagari.
  if (
    devanagariCount >= 3 &&
    devanagariCount >= latinCount
  ) {
    return "Hindi";
  }

  // Romanized Hindi / Hinglish.
  const words = tokenizeLatin(trimmed);

  const hinglishCount = words.filter((word) =>
    HINGLISH_WORDS.has(word)
  ).length;

  const hasDevanagari = devanagariCount > 0;
  const hasLatin = latinCount > 0;

  // Mixed Hindi and English scripts.
  if (
    hasDevanagari &&
    hasLatin &&
    devanagariCount >= 2
  ) {
    return "Hinglish";
  }

  // Multiple recognizable Hindi words are a stronger signal
  // than a single word that may be ambiguous.
  if (hinglishCount >= 2) {
    return "Hinglish";
  }

  // Handle short requests such as "batao" or "samjhao".
  if (
    hinglishCount === 1 &&
    words.length <= 3 &&
    HINGLISH_WORDS.has(words[0]) &&
    latinCount > 0
  ) {
    return "Hinglish";
  }

  // Predominantly Devanagari text, even when mixed with
  // a few English words.
  if (
    devanagariCount > 0 &&
    devanagariCount > latinCount
  ) {
    return "Hindi";
  }

  return "English";
}

export function getLanguageInstructions(
  language: ResponseLanguage
): string {
  switch (language) {
    case "Hindi":
      return `
RESPONSE LANGUAGE:
The user is communicating primarily in Hindi.

- Respond in natural Hindi using Devanagari script.
- Keep established English technical terms where clearer.
- Explain technical concepts in Hindi when helpful.
- Do not switch entirely to English unless requested.
`;


case "Hinglish":
  return `
LANGUAGE AND NATURALNESS RULES:

- Write in natural, fluent, conversational Hinglish.
- Sound like a person who comfortably speaks both Hindi and English,
  not like a translator converting English sentences word by word.
- Use simple, natural sentence structures.
- Do not force Hindi words into every English sentence.
- Keep technical terms in English when that sounds more natural.
- Avoid awkward literal translations, unnatural word order,
  repetitive phrases, and overly formal vocabulary.
- Match the language and script the user actually uses.
- If the user writes Hindi in Roman script, Romanized Hindi is acceptable,
  but do not transliterate every English word into Hindi.
- If the user uses a natural mix of Hindi and English, preserve that mix.
- Prioritize clarity, fluency, and correct grammar over matching every word.
- For code, calculations, accounting, and technical explanations,
  keep terminology precise and explain it naturally.
- If a sentence sounds awkward when spoken aloud, rewrite it naturally.
`;


    case "Other":
      return `
RESPONSE LANGUAGE:
The user's language could not be confidently identified.

- Respond in the language used by the user where possible.
- If uncertain, use clear English.
`;

    case "English":
    default:
      return `
RESPONSE LANGUAGE:
The user is communicating primarily in English.

- Respond in clear, natural English.
- Keep technical terms precise.
- Do not unnecessarily switch to Hindi or Hinglish.
`;
  }
}
