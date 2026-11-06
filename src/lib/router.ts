
export type ContextMode =
  | "local"
  | "website"
  | "web"
  | "document";

export type TaskWorkspace =
  | "Chat"
  | "CA"
  | "Coder";

type RouterInput = {
  query: string;
  hasDocument: boolean;
};

function containsUrl(text: string) {
  return /https?:\/\/[^\s]+/i.test(text);
}

function containsDomain(text: string) {
  return /\b(?:www\.)?[a-z0-9-]+\.(?:com|in|org|net|gov|edu|co|io)\b/i.test(
    text
  );
}

function asksForCurrentInformation(text: string) {
  const keywords = [
    "latest", "current", "today", "now", "recent",
    "news", "update", "price", "rate", "stock",
    "weather", "result", "results", "this week",
    "this month", "आज", "अभी", "वर्तमान", "ताज़ा",
    "ताजा", "लेटेस्ट", "नवीनतम", "समाचार", "खबर",
    "कीमत", "भाव", "रेट", "नतीजा", "परिणाम",
  ];

  const normalized = text.toLowerCase();

  return keywords.some((keyword) =>
    normalized.includes(keyword.toLowerCase())
  );
}

export function detectContextMode({
  query,
  hasDocument,
}: RouterInput): ContextMode {
  const text = query.trim();

  if (hasDocument) return "document";

  if (containsUrl(text) || containsDomain(text)) {
    return "website";
  }

  if (asksForCurrentInformation(text)) {
    return "web";
  }

  return "local";
}

const CODING_PATTERNS = [
  /\b(debug|debugging|stack trace|compile error|runtime error)\b/i,
  /\b(code|function|class|component|api|endpoint|script|typescript|javascript|python|sql|html|css|react|next\.?js)\b/i,
  /\b(terminal|powershell|npm|package\.json|typescript error|build error|dependency error)\b/i,
  /\b(website|web app|application|software|programming|repository|repo)\b/i,
  /\bकोड|प्रोग्रामिंग|बग फिक्स|एरर ठीक\b/i,
];

const CA_PATTERNS = [
  /\b(gst|cgst|sgst|igst|input tax credit|itc|gstr[- ]?[1-9]|e[- ]?invoice|e[- ]?way bill)\b/i,
  /\b(income tax|income-tax|itr[- ]?[1-9]?|assessment year|financial year|tax regime|tds|tcs|advance tax|capital gains tax|tax deduction|tax exemption|tax return|tax liability)\b/i,
  /\b(journal entr(?:y|ies)|trial balance|balance sheet|profit and loss|cash flow statement|depreciation|accounting standard|ind as|audit report|cost accounting|bank reconciliation)\b/i,
  /\b(ca foundation|ca intermediate|ca final|icai|companies act|corporate law|statutory audit|tax audit)\b/i,
  /\b(tax calculation|gst calculation|income tax calculation|accounting treatment|debit note|credit note)\b/i,
  /\b(जीएसटी|आयकर|इनकम टैक्स|टीडीएस|लेखा-जोखा|जर्नल एंट्री|बैलेंस शीट|ऑडिट)\b/i,
];

export function detectTaskWorkspace(
  query: string
): TaskWorkspace {
  const text = query.trim();

  if (!text) return "Chat";

  const isCA = CA_PATTERNS.some((pattern) =>
    pattern.test(text)
  );

  const isCoding = CODING_PATTERNS.some((pattern) =>
    pattern.test(text)
  );

  // Prefer clear specialist signals. If both match,
  // avoid guessing and remain in general chat.
  if (isCA && isCoding) return "Chat";
  if (isCA) return "CA";
  if (isCoding) return "Coder";

  return "Chat";
}
