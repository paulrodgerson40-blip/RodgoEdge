import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://170.64.209.149:8000/api/frontend-edges", {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "BACKEND_FETCH_FAILED" },
        { status: 500 }
      );
    }

    const data = await res.json();

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error: "API_ROUTE_ERROR",
        details: String(err),
      },
      { status: 500 }
    );
  }
}
