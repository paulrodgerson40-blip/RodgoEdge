"use client";

import { useEffect, useState } from "react";

type Market = {
  type: string;
  selection: string;
  confidence?: number | null;
  edge?: number | null;
  reason?: string | null;
};

type EdgeCard = {
  game_id: string;
  sport: string;
  game: string;
  start_time_utc?: string | null;
  start_time_local?: string | null;
  status?: string | null;
  locked?: boolean;
  markets: Market[];
  result?: { home?: number; away?: number } | null;
  outcome?: string | null;
  created_at_utc?: string;
  updated_at_utc?: string;
};

type Payload = {
  generated_at_utc?: string;
  cards: EdgeCard[];
};

export default function Home() {
  const [payload, setPayload] = useState<Payload>({ cards: [] });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  async function loadEdges() {
    try {
      const res = await fetch("/api/frontend-edges", { cache: "no-store" });
      const data = await res.json();
      setPayload({ cards: Array.isArray(data.cards) ? data.cards : [], generated_at_utc: data.generated_at_utc });
    } catch {
      setPayload({ cards: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEdges();
    const timer = setInterval(loadEdges, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <h1 style={styles.title}>Rodgo Edge</h1>
          <p style={styles.subtitle}>Live edge alerts only. No edge, no card.</p>
        </div>
        <div style={styles.badge}>{loading ? "Loading" : `${payload.cards.length} active`}</div>
      </section>

      {payload.cards.length === 0 ? (
        <section style={styles.empty}>
          <h2 style={styles.emptyTitle}>Waiting for next edge</h2>
          <p style={styles.emptyText}>
            Cards appear here only when the backend detects a total edge, spread edge, or both.
          </p>
          <p style={styles.small}>Last checked: {payload.generated_at_utc || "—"}</p>
        </section>
      ) : (
        <section style={styles.grid}>
          {payload.cards.map((card) => {
            const isOpen = !!revealed[card.game_id];

            return (
              <article key={card.game_id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div>
                    <div style={styles.sport}>{card.sport || "NBA"}</div>
                    <h2 style={styles.game}>{card.game}</h2>
                    <p style={styles.meta}>{card.start_time_local || card.start_time_utc || "Start time pending"}</p>
                  </div>
                  <div style={styles.status}>{card.status || "PENDING"}</div>
                </div>

                {card.result ? (
                  <div style={styles.result}>
                    Final score: Away {card.result.away ?? "—"} - Home {card.result.home ?? "—"}
                  </div>
                ) : null}

                <button
                  style={styles.revealButton}
                  onClick={() =>
                    setRevealed((prev) => ({
                      ...prev,
                      [card.game_id]: !prev[card.game_id],
                    }))
                  }
                >
                  {isOpen ? "Hide edge" : "Reveal edge"}
                </button>

                {isOpen ? (
                  <div style={styles.markets}>
                    {card.markets.map((m, idx) => (
                      <div key={`${card.game_id}-${m.type}-${idx}`} style={styles.market}>
                        <div style={styles.marketHeader}>
                          <strong>{m.type}</strong>
                          <span>{m.confidence != null ? `${m.confidence}% confidence` : "Confidence pending"}</span>
                        </div>
                        <div style={styles.selection}>{m.selection}</div>
                        {m.edge != null ? <div style={styles.small}>Edge: {m.edge}</div> : null}
                        {m.reason ? <div style={styles.reason}>{m.reason}</div> : null}
                      </div>
                    ))}

                    <div style={styles.outcome}>
                      Outcome: <strong>{card.outcome || "PENDING"}</strong>
                    </div>
                  </div>
                ) : (
                  <div style={styles.locked}>Locked edge card. Tap reveal to view selection.</div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 28,
    background: "#0b1020",
    color: "#f8fafc",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 28,
  },
  title: {
    fontSize: 34,
    margin: 0,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#94a3b8",
  },
  badge: {
    border: "1px solid #334155",
    borderRadius: 999,
    padding: "10px 14px",
    color: "#cbd5e1",
  },
  empty: {
    border: "1px solid #1e293b",
    background: "#111827",
    borderRadius: 18,
    padding: 28,
  },
  emptyTitle: {
    margin: 0,
    fontSize: 24,
  },
  emptyText: {
    color: "#cbd5e1",
  },
  small: {
    fontSize: 13,
    color: "#94a3b8",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
    gap: 18,
  },
  card: {
    border: "1px solid #1e293b",
    background: "#111827",
    borderRadius: 18,
    padding: 20,
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
  },
  sport: {
    fontSize: 12,
    color: "#38bdf8",
    fontWeight: 700,
    letterSpacing: 1,
  },
  game: {
    margin: "8px 0",
    fontSize: 22,
  },
  meta: {
    color: "#94a3b8",
    margin: 0,
  },
  status: {
    height: "fit-content",
    border: "1px solid #334155",
    borderRadius: 999,
    padding: "7px 10px",
    fontSize: 12,
    color: "#cbd5e1",
  },
  result: {
    marginTop: 14,
    padding: 10,
    borderRadius: 12,
    background: "#020617",
    color: "#cbd5e1",
  },
  revealButton: {
    width: "100%",
    marginTop: 18,
    padding: "13px 16px",
    borderRadius: 14,
    border: "0",
    cursor: "pointer",
    background: "#22c55e",
    color: "#052e16",
    fontWeight: 800,
    fontSize: 15,
  },
  locked: {
    marginTop: 14,
    color: "#94a3b8",
    fontSize: 14,
  },
  markets: {
    marginTop: 16,
    display: "grid",
    gap: 12,
  },
  market: {
    border: "1px solid #334155",
    borderRadius: 14,
    padding: 14,
    background: "#020617",
  },
  marketHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    color: "#cbd5e1",
    fontSize: 13,
  },
  selection: {
    marginTop: 10,
    fontSize: 21,
    fontWeight: 800,
  },
  reason: {
    marginTop: 10,
    color: "#cbd5e1",
    fontSize: 14,
  },
  outcome: {
    paddingTop: 8,
    color: "#e2e8f0",
  },
};
