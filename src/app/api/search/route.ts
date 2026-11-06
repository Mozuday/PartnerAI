
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "Search query is required", results: [] },
        { status: 400 }
      );
    }

    const headers = {
      "User-Agent": "PartnerAI/1.0 (educational assistant)",
    };

    // Step 1: Search Wikipedia
    const searchParams = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: query.trim(),
      format: "json",
      formatversion: "2",
      srlimit: "5",
    });

    const searchResponse = await fetch(
      `https://en.wikipedia.org/w/api.php?${searchParams}`,
      { headers, cache: "no-store" }
    );

    if (!searchResponse.ok) {
      throw new Error(`Wikipedia search error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const pages = searchData.query?.search || [];

    
    if (pages.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Step 2: Fetch actual article extracts
    const pageIds = pages.map(
      (page: { pageid: number }) => page.pageid
    );

    const extractParams = new URLSearchParams({
      action: "query",
      pageids: pageIds.join("|"),
      prop: "extracts",
      exintro: "1",
      explaintext: "1",
      exchars: "2500",
      format: "json",
      formatversion: "2",
    });

    const extractResponse = await fetch(
      `https://en.wikipedia.org/w/api.php?${extractParams}`,
      { headers, cache: "no-store" }
    );

    if (!extractResponse.ok) {
      throw new Error(`Wikipedia article error: ${extractResponse.status}`);
    }

    const extractData = await extractResponse.json();

    const articleMap = new Map(
      (extractData.query?.pages || []).map(
        (page: { pageid: number; extract?: string }) => [
          page.pageid,
          page.extract || "",
        ]
      )
    );

    // Step 3: Return articles in search ranking order
    const results = pages.map(
      (page: { title: string; pageid: number }) => ({
        title: page.title,
        url: `https://en.wikipedia.org/?curid=${page.pageid}`,
        snippet: articleMap.get(page.pageid) || "",
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Wikipedia search error:", error);

    return NextResponse.json(
      { error: "Wikipedia search failed", results: [] },
      { status: 500 }
    );
  }
}