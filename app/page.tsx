"use client";

import { useEffect, useMemo, useState } from "react";

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

function fmtTime(value?: string | null) {
  if (!value) return "Start time pending";
  if (value === "Test card") return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-AU", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

function statusLabel(status?: string | null) {
  const s = (status || "PENDING").replaceAll("_", " ");
  if (s === "NOT STARTED") return "Waiting to start";
  if (s === "LIVE") return "Live now";
  if (s === "FINAL") return "Final";
  return s;
}

function outcomeStyle(outcome?: string | null) {
  if (outcome === "WIN") return { color: "#22c55e", label: "WIN" };
  if (outcome === "LOSS") return { color: "#ef4444", label: "LOSS" };
  if (outcome === "PUSH") return { color: "#f59e0b", label: "PUSH" };
  return { color: "#94a3b8", label: "Pending result" };
}

export default function Home() {
  const [payload, setPayload] = useState<Payload>({ cards: [] });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>("");

  async function loadEdges() {
    try {
      const res = await fetch("/api/frontend-edges", { cache: "no-store" });
      const data = await res.json();

      setPayload({
        cards: Array.isArray(data.cards) ? data.cards : [],
        generated_at_utc: data.generated_at_utc,
      });
      setLastChecked(new Date().toLocaleTimeString("en-AU"));
    } catch {
      setPayload({ cards: [] });
      setLastChecked(new Date().toLocaleTimeString("en-AU"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEdges();
    const timer = setInterval(loadEdges, 30000);
    return () => clearInterval(timer);
  }, []);

  const cards = useMemo(() => payload.cards || [], [payload.cards]);

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.kicker}>RODGO EDGE LIVE</div>
          <h1 style={styles.title}>Edge Alerts</h1>
          <p style={styles.subtitle}>
            Only confirmed backend edges appear here. If there is no edge, there is no card.
          </p>
        </div>

        <div style={styles.statsBox}>
          <div style={styles.bigNumber}>{cards.length}</div>
          <div style={styles.statsLabel}>active edge{cards.length === 1 ? "" : "s"}</div>
          <div style={styles.tiny}>Auto-refresh every 30s</div>
        </div>
      </section>

      {cards.length === 0 ? (
        <section style={styles.empty}>
          <div style={styles.emptyIcon}>⏳</div>
          <h2 style={styles.emptyTitle}>Waiting for next edge</h2>
          <p style={styles.emptyText}>
            The backend is monitoring the slate. When a total edge, spread edge, or both are found,
            the card will appear here automatically.
          </p>
          <div style={styles.emptyGrid}>
            <div>
              <strong>Frontend role</strong>
              <span>Reader only</span>
            </div>
            <div>
              <strong>Source</strong>
              <span>frontend_edges.json</span>
            </div>
            <div>
              <strong>Last checked</strong>
              <span>{lastChecked || "Checking..."}</span>
            </div>
          </div>
        </section>
      ) : (
        <section style={styles.grid}>
          {cards.map((card) => {
            const isOpen = !!revealed[card.game_id];
            const outcome = outcomeStyle(card.outcome);
            const hasBoth = card.markets?.length > 1;

            return (
              <article key={card.game_id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div>
                    <div style={styles.sport}>{card.sport || "NBA"}</div>
                    <h2 style={styles.game}>{card.game}</h2>
                    <p style={styles.meta}>{fmtTime(card.start_time_local || card.start_time_utc)}</p>
                  </div>

                  <div style={styles.rightStack}>
                    <div style={styles.status}>{statusLabel(card.status)}</div>
                    <div style={{ ...styles.outcomePill, borderColor: outcome.color, color: outcome.color }}>
                      {outcome.label}
                    </div>
                  </div>
                </div>

                <div style={styles.summaryRow}>
                  <div>
                    <strong>{hasBoth ? "Total + Spread edge found" : `${card.markets?.[0]?.type || "Edge"} found`}</strong>
                    <span>Backend confirmed. Click reveal to view selection.</span>
                  </div>

                  {card.result ? (
                    <div style={styles.scoreBox}>
                      <span>Score</span>
                      <strong>
                        Away {card.result.away ?? "—"} - Home {card.result.home ?? "—"}
                      </strong>
                    </div>
                  ) : (
                    <div style={styles.scoreBox}>
                      <span>Result</span>
                      <strong>Pending</strong>
                    </div>
                  )}
                </div>

                <button
                  style={isOpen ? styles.hideButton : styles.revealButton}
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
                          <div>
                            <div style={styles.marketType}>{m.type}</div>
                            <div style={styles.selection}>{m.selection}</div>
                          </div>
                          <div style={styles.confidence}>
                            <strong>{m.confidence != null ? `${m.confidence}%` : "—"}</strong>
                            <span>confidence</span>
                          </div>
                        </div>

                        <div style={styles.detailGrid}>
                          <div>
                            <span>Edge</span>
                            <strong>{m.edge != null ? m.edge : "Pending"}</strong>
                          </div>
                          <div>
                            <span>Status</span>
                            <strong>{statusLabel(card.status)}</strong>
                          </div>
                          <div>
                            <span>Outcome</span>
                            <strong style={{ color: outcome.color }}>{outcome.label}</strong>
                          </div>
                        </div>

                        <div style={styles.reasonBox}>
                          <span>Why this edge?</span>
                          <p>{m.reason || "Reason pending from backend."}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.locked}>
                    🔒 Edge hidden. Open the card to view the backend selection.
                  </div>
                )}

                <div style={styles.footer}>
                  <span>Created: {fmtTime(card.created_at_utc)}</span>
                  <span>Updated: {fmtTime(card.updated_at_utc)}</span>
                </div>
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
    background: "linear-gradient(180deg, #070b16 0%, #0b1020 100%)",
    color: "#f8fafc",
    fontFamily: "Arial, sans-serif",
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "center",
    marginBottom: 26,
  },
  kicker: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 42,
    margin: "8px 0 6px",
    letterSpacing: -1,
  },
  subtitle: {
    color: "#94a3b8",
    margin: 0,
    fontSize: 16,
  },
  statsBox: {
    minWidth: 145,
    border: "1px solid #263449",
    borderRadius: 18,
    padding: 16,
    textAlign: "center",
    background: "#0f172a",
  },
  bigNumber: {
    fontSize: 34,
    fontWeight: 900,
  },
  statsLabel: {
    color: "#e2e8f0",
    fontSize: 13,
  },
  tiny: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 12,
  },
  empty: {
    border: "1px solid #1e293b",
    background: "#111827",
    borderRadius: 22,
    padding: 32,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyTitle: {
    margin: 0,
    fontSize: 28,
  },
  emptyText: {
    color: "#cbd5e1",
    maxWidth: 720,
    lineHeight: 1.6,
  },
  emptyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginTop: 20,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: 20,
  },
  card: {
    border: "1px solid #263449",
    background: "#111827",
    borderRadius: 22,
    padding: 22,
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
  },
  sport: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 1.2,
  },
  game: {
    margin: "8px 0",
    fontSize: 24,
    letterSpacing: -0.4,
  },
  meta: {
    color: "#94a3b8",
    margin: 0,
  },
  rightStack: {
    display: "grid",
    gap: 8,
    justifyItems: "end",
    height: "fit-content",
  },
  status: {
    border: "1px solid #334155",
    borderRadius: 999,
    padding: "7px 11px",
    fontSize: 12,
    color: "#cbd5e1",
    whiteSpace: "nowrap",
  },
  outcomePill: {
    border: "1px solid",
    borderRadius: 999,
    padding: "7px 11px",
    fontSize: 12,
    fontWeight: 900,
  },
  summaryRow: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    background: "#0b1224",
    border: "1px solid #1e293b",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
  },
  scoreBox: {
    minWidth: 130,
    textAlign: "right",
  },
  revealButton: {
    width: "100%",
    marginTop: 18,
    padding: "15px 16px",
    borderRadius: 16,
    border: 0,
    cursor: "pointer",
    background: "#22c55e",
    color: "#052e16",
    fontWeight: 900,
    fontSize: 15,
  },
  hideButton: {
    width: "100%",
    marginTop: 18,
    padding: "15px 16px",
    borderRadius: 16,
    border: "1px solid #334155",
    cursor: "pointer",
    background: "#0f172a",
    color: "#e2e8f0",
    fontWeight: 900,
    fontSize: 15,
  },
  markets: {
    marginTop: 16,
    display: "grid",
    gap: 14,
  },
  market: {
    border: "1px solid #334155",
    borderRadius: 18,
    padding: 16,
    background: "#020617",
  },
  marketHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
  },
  marketType: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 1,
  },
  selection: {
    marginTop: 7,
    fontSize: 24,
    fontWeight: 900,
  },
  confidence: {
    textAlign: "right",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginTop: 16,
  },
  reasonBox: {
    marginTop: 16,
    padding: 14,
    background: "#0b1224",
    borderRadius: 14,
    color: "#cbd5e1",
  },
  locked: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    background: "#020617",
    color: "#94a3b8",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 14,
    color: "#64748b",
    fontSize: 12,
  },
};
