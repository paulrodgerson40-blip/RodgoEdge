import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.RODGO_BACKEND_URL || "http://170.64.209.149:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/frontend-edges`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          generated_at_utc: null,
          cards: [],
          error: "BACKEND_FETCH_FAILED",
          status: res.status,
        },
        { status: 200 }
      );
    }

    const data = await res.json();

    // IMPORTANT:
    // The live board expects { cards: [] }.
    // If the backend accidentally returns the full dashboard { games: [] },
    // do NOT let the frontend silently treat it as no cards forever.
    if (Array.isArray(data?.cards)) {
      return NextResponse.json(
        {
          generated_at_utc: data.generated_at_utc || null,
          cards: data.cards,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    return NextResponse.json(
      {
        generated_at_utc: data?.generated_at_utc || null,
        cards: [],
        error: "BACKEND_RETURNED_NO_CARDS",
        backend_keys: data && typeof data === "object" ? Object.keys(data) : [],
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        generated_at_utc: null,
        cards: [],
        error: "API_ROUTE_ERROR",
        details: String(err),
      },
      { status: 200 }
    );
  }
}
