export type SearchMode =
  | "off"
  | "web"
  | "web+normal";

export type SearchSource = {
  title: string;
  url: string;
  snippet: string;
  source: "Web" | "Website";
};

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
};

type TavilyResponse = {
  results?: TavilyResult[];
};

const MAX_PAGE_BYTES = 1_500_000;
const MAX_PAGE_TEXT = 30_000;
const MAX_URLS = 3;
const MAX_SEARCH_RESULTS = 5;

function extractUrls(text: string): string[] {
  const matches = text.match(
    /https?:\/\/[^\s<>"')\]]+/gi
  );

  if (!matches) {
    return [];
  }

  return Array.from(
    new Set(
      matches.map((url) =>
        url.replace(/[),.;!?]+$/g, "")
      )
    )
  );
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    parsed.hash = "";

    if (
      parsed.pathname !== "/" &&
      parsed.pathname.endsWith("/")
    ) {
      parsed.pathname = parsed.pathname.replace(
        /\/+$/,
        ""
      );
    }

    return parsed.toString();
  } catch {
    return url.trim();
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url)
      .hostname
      .replace(/^www\./i, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

function isPrivateOrLocalHost(
  hostname: string
): boolean {
  const host = hostname.toLowerCase();

  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    return true;
  }

  const ipv4Parts = host.split(".").map(Number);

  if (
    ipv4Parts.length === 4 &&
    ipv4Parts.every((part) =>
      Number.isInteger(part)
    )
  ) {
    const [a, b] = ipv4Parts;

    if (a === 10) {
      return true;
    }

    if (
      a === 172 &&
      b >= 16 &&
      b <= 31
    ) {
      return true;
    }

    if (
      a === 192 &&
      b === 168
    ) {
      return true;
    }

    if (
      a === 169 &&
      b === 254
    ) {
      return true;
    }

    if (a === 0) {
      return true;
    }
  }

  return false;
}

function decodeHtmlEntities(
  text: string
): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(
      /&#(\d+);/g,
      (_, code: string) =>
        String.fromCharCode(Number(code))
    )
    .replace(
      /&#x([0-9a-f]+);/gi,
      (_, code: string) =>
        String.fromCharCode(
          parseInt(code, 16)
        )
    );
}

function htmlToText(
  html: string
): {
  title: string;
  text: string;
} {
  const titleMatch = html.match(
    /<title[^>]*>([\s\S]*?)<\/title>/i
  );

  const title = titleMatch
    ? decodeHtmlEntities(
        titleMatch[1]
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      )
    : "";

  let content = html;

  content = content
    .replace(
      /<(script|style|noscript|svg|canvas|iframe|template)[^>]*>[\s\S]*?<\/\1>/gi,
      " "
    )
    .replace(
      /<(nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi,
      " "
    );

  content = content.replace(
    /<\/?(p|div|section|article|main|li|ul|ol|h1|h2|h3|h4|h5|h6|br|tr|td|th)[^>]*>/gi,
    "\n"
  );

  content = content.replace(
    /<[^>]+>/g,
    " "
  );

  content = decodeHtmlEntities(content);

  content = content
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    title,
    text: content.slice(0, MAX_PAGE_TEXT),
  };
}

async function readWebsite(
  url: string
): Promise<SearchSource | null> {
  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:"
    ) {
      return null;
    }

    if (
      isPrivateOrLocalHost(
        parsedUrl.hostname
      )
    ) {
      return null;
    }

    const response = await fetch(
      parsedUrl.toString(),
      {
        method: "GET",

        headers: {
          "User-Agent":
            "PartnerAI/1.0 website-reader",

          Accept:
            "text/html, text/plain, application/json;q=0.9, */*;q=0.5",
        },

        redirect: "follow",

        signal:
          AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      return {
        title: parsedUrl.hostname,
        url,
        snippet:
          `The website returned HTTP ${response.status}.`,
        source: "Website",
      };
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) ?? "";

    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/json")
    ) {
      return {
        title: parsedUrl.hostname,
        url,
        snippet:
          "This URL does not point to a readable HTML, text, or JSON webpage.",
        source: "Website",
      };
    }

    const contentLength = Number(
      response.headers.get(
        "content-length"
      ) ?? "0"
    );

    if (
      contentLength > MAX_PAGE_BYTES
    ) {
      return {
        title: parsedUrl.hostname,
        url,
        snippet:
          "The webpage is too large for PartnerAI to read directly.",
        source: "Website",
      };
    }

    const buffer =
      await response.arrayBuffer();

    if (
      buffer.byteLength > MAX_PAGE_BYTES
    ) {
      return {
        title: parsedUrl.hostname,
        url,
        snippet:
          "The webpage is too large for PartnerAI to read directly.",
        source: "Website",
      };
    }

    const rawText =
      new TextDecoder().decode(buffer);

    let title = parsedUrl.hostname;
    let text = rawText;

    if (
      contentType.includes("text/html")
    ) {
      const parsed =
        htmlToText(rawText);

      if (parsed.title) {
        title = parsed.title;
      }

      text = parsed.text;
    } else {
      text = rawText
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_PAGE_TEXT);
    }

    if (!text.trim()) {
      return {
        title,
        url,
        snippet:
          "PartnerAI could open this webpage, but no readable text was found.",
        source: "Website",
      };
    }

    return {
      title,
      url,
      snippet: text,
      source: "Website",
    };
  } catch (error) {
    console.error(
      `Website reading failed for ${url}:`,
      error
    );

    return {
      title: url,
      url,
      snippet:
        "PartnerAI could not read this webpage. The website may block automated requests or may be temporarily unavailable.",
      source: "Website",
    };
  }
}

export async function readWebsites(
  text: string
): Promise<SearchSource[]> {
  const urls = extractUrls(text);

  if (urls.length === 0) {
    return [];
  }

  const limitedUrls =
    urls.slice(0, MAX_URLS);

  const results =
    await Promise.all(
      limitedUrls.map((url) =>
        readWebsite(url)
      )
    );

  return results.filter(
    (
      result
    ): result is SearchSource =>
      result !== null
  );
}

export function extractFirstUrl(
  text: string
): string | null {
  return (
    extractUrls(text)[0] ?? null
  );
}

export function buildSearchQuery(
  query: string
): string {
  const url =
    extractFirstUrl(query);

  if (!url) {
    return query.trim();
  }

  const domain = getDomain(url);

  if (!domain) {
    return query.trim();
  }

  const withoutUrl = query
    .replace(url, "")
    .replace(
      /https?:\/\/[^\s<>"')\]]+/gi,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  if (withoutUrl) {
    return `"${domain}" ${withoutUrl}`;
  }

  return `"${domain}"`;
}

function isRelevantToDomain(
  resultUrl: string,
  targetDomain: string
): boolean {
  const resultDomain =
    getDomain(resultUrl);

  if (!resultDomain) {
    return false;
  }

  return (
    resultDomain === targetDomain ||
    resultDomain.endsWith(
      `.${targetDomain}`
    )
  );
}

function scoreSearchResult(
  result: SearchSource,
  targetDomain: string,
  query: string
): number {
  let score = 0;

  const resultDomain =
    getDomain(result.url);

  if (
    resultDomain === targetDomain
  ) {
    score += 100;
  } else if (
    resultDomain.endsWith(
      `.${targetDomain}`
    )
  ) {
    score += 80;
  }

  const haystack =
    `${result.title} ${result.snippet}`.toLowerCase();

  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(
      (word) => word.length >= 4
    )
    .slice(0, 10);

  for (const word of queryWords) {
    if (haystack.includes(word)) {
      score += 2;
    }
  }

  return score;
}

export async function searchWeb(
  query: string
): Promise<SearchSource[]> {
  const apiKey =
    process.env.TAVILY_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "TAVILY_API_KEY is missing in .env.local"
    );
  }

  const cleanQuery = query
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanQuery) {
    return [];
  }

  const exactUrl =
    extractFirstUrl(cleanQuery);

  const targetDomain = exactUrl
    ? getDomain(exactUrl)
    : "";

  const searchQuery =
    buildSearchQuery(cleanQuery);

  console.log(
    "PartnerAI search query:",
    searchQuery
  );

  const response = await fetch(
    "https://api.tavily.com/search",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify({
        api_key: apiKey,
        query: searchQuery,
        search_depth: "basic",
        max_results: MAX_SEARCH_RESULTS,
        include_answer: false,
        include_raw_content: false,
        topic: "general",
      }),

      signal: AbortSignal.timeout(20000),
    }
  );

  /*
   * Tavily can return a useful JSON error message.
   * Read it before throwing so we know exactly
   * why a request failed.
   */
  if (!response.ok) {
    let errorDetails = "";

    try {
      const errorBody =
        await response.json();

      errorDetails =
        typeof errorBody === "object" &&
        errorBody !== null
          ? JSON.stringify(errorBody)
          : String(errorBody);
    } catch {
      try {
        errorDetails =
          await response.text();
      } catch {
        errorDetails = "";
      }
    }

    console.error(
      "Tavily API error:",
      response.status,
      errorDetails
    );

    throw new Error(
      `Web search failed (${response.status})${
        errorDetails
          ? `: ${errorDetails}`
          : ""
      }`
    );
  }

  const result =
    (await response.json()) as TavilyResponse;

  const rawResults: TavilyResult[] =
    Array.isArray(result.results)
      ? result.results
      : [];

  let sources: SearchSource[] =
    rawResults
      .map(
        (
          item: TavilyResult
        ): SearchSource | null => {
          if (!item.url) {
            return null;
          }

          return {
            title:
              item.title ??
              item.url,

            url: item.url,

            snippet:
              item.content ??
              "",

            source: "Web",
          };
        }
      )
      .filter(
        (
          item
        ): item is SearchSource =>
          item !== null
      );

  /*
   * If the user included a website URL,
   * prefer results from that website.
   */
  if (targetDomain) {
    const relevant =
      sources
        .filter((source) =>
          isRelevantToDomain(
            source.url,
            targetDomain
          )
        )
        .sort(
          (a, b) =>
            scoreSearchResult(
              b,
              targetDomain,
              cleanQuery
            ) -
            scoreSearchResult(
              a,
              targetDomain,
              cleanQuery
            )
        );

    const external =
      sources
        .filter(
          (source) =>
            !isRelevantToDomain(
              source.url,
              targetDomain
            )
        )
        .sort(
          (a, b) =>
            scoreSearchResult(
              b,
              targetDomain,
              cleanQuery
            ) -
            scoreSearchResult(
              a,
              targetDomain,
              cleanQuery
            )
        );

    sources = [
      ...relevant,
      ...external.slice(0, 2),
    ].slice(
      0,
      MAX_SEARCH_RESULTS
    );
  }

  /*
   * Remove duplicate URLs.
   */
  const seen = new Set<string>();

  return sources.filter(
    (source) => {
      const normalized =
        normalizeUrl(source.url);

      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);

      return true;
    }
  );
}

export async function runSearch(
  query: string,
  mode: SearchMode
): Promise<SearchSource[]> {
  if (mode === "off") {
    return [];
  }

  return searchWeb(query);
}