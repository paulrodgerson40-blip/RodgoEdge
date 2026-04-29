import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.RODGO_BACKEND_URL || "http://170.64.209.149:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/upcoming-games`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          error: "BACKEND_FETCH_FAILED",
          status: res.status,
          games: [],
        },
        { status: 500 }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      games: Array.isArray(data?.games) ? data.games : [],
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "API_ROUTE_ERROR",
        details: String(err),
        games: [],
      },
      { status: 500 }
    );
  }
}
