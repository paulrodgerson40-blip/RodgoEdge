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
  generated_at_utc?: string | null;
  cards: EdgeCard[];
};

type UpcomingGame = {
  sport: string;
  game: string;
  start_time_utc?: string | null;
  start_time_local?: string | null;
  minutes_to_start?: number | null;
};

function cleanSelection(selection?: string | null) {
  if (!selection) return "Signal pending";
  return selection.replace(/^BET\s+/i, "").trim();
}

function cleanGameName(value?: string | null) {
  if (!value) return "Game pending";

  return value
    .replace(/\.json$/i, "")
    .replace(/^[0-9]{4}_/, "")
    .replace(/_[a-z0-9]{8,}$/i, "")
    .replace(/_nba$/i, "")
    .replace(/_afl$/i, "")
    .replace(/_nrl$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function marketTitle(type?: string | null) {
  const t = (type || "").toUpperCase();
  if (t === "SPREAD") return "Spread Signal";
  if (t === "TOTAL") return "Total Signal";
  return "Edge Signal";
}

function fmtNumber(value?: number | null, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Pending";
  }
  const n = Number(value);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2).replace(/\.00$/, "")}${suffix}`;
}

function fmtTime(value?: string | null) {
  if (!value) return "Start time pending";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtCountdown(minutes?: number | null) {
  if (minutes === null || minutes === undefined || Number.isNaN(Number(minutes))) {
    return "Pending";
  }

  if (minutes < 0) return "Started";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function triggerLabel(minutes?: number | null) {
  if (minutes === null || minutes === undefined || Number.isNaN(Number(minutes))) {
    return "Trigger pending";
  }

  const triggerIn = minutes - 10;
  if (triggerIn <= 0 && minutes >= -20) return "Trigger window active";
  if (minutes < -20) return "Window closed";
  if (triggerIn < 60) return `Triggers in ${triggerIn} min`;

  const hours = Math.floor(triggerIn / 60);
  const mins = triggerIn % 60;
  return mins === 0 ? `Triggers in ${hours}h` : `Triggers in ${hours}h ${mins}m`;
}

function statusLabel(status?: string | null) {
  const s = (status || "PENDING").replaceAll("_", " ").toUpperCase();
  if (s === "NOT STARTED") return "Waiting to start";
  if (s === "LIVE") return "Live now";
  if (s === "FINAL") return "Final";
  if (s === "PENDING") return "Pending";
  return s
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function outcomeStyle(outcome?: string | null) {
  const o = (outcome || "PENDING").toUpperCase();
  if (o === "WIN") {
    return {
      label: "WIN",
      color: "#22c55e",
      background: "rgba(34,197,94,0.12)",
      border: "rgba(34,197,94,0.55)",
      icon: "✅",
    };
  }
  if (o === "LOSS") {
    return {
      label: "LOSS",
      color: "#ef4444",
      background: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.55)",
      icon: "❌",
    };
  }
  if (o === "PUSH") {
    return {
      label: "PUSH",
      color: "#f59e0b",
      background: "rgba(245,158,11,0.12)",
      border: "rgba(245,158,11,0.55)",
      icon: "➖",
    };
  }
  return {
    label: "Pending result",
    color: "#94a3b8",
    background: "rgba(148,163,184,0.10)",
    border: "rgba(148,163,184,0.35)",
    icon: "⏳",
  };
}

function splitTeams(game?: string | null) {
  const raw = game || "";
  const parts = raw.split(" @ ");
  if (parts.length === 2) {
    return {
      away: parts[0],
      home: parts[1],
    };
  }
  return {
    away: "Away",
    home: "Home",
  };
}

function explainOutcome(card: EdgeCard, market: Market) {
  const outcome = (card.outcome || "PENDING").toUpperCase();
  const selection = cleanSelection(market.selection);
  const teams = splitTeams(card.game);

  if (!card.result) {
    return "Result pending. The system will update this card once the final score is available.";
  }

  if (outcome === "WIN") {
    return `${selection} was successful. Final score: ${teams.away} ${card.result.away ?? "—"} — ${teams.home} ${card.result.home ?? "—"}.`;
  }

  if (outcome === "LOSS") {
    return `${selection} was unsuccessful. Final score: ${teams.away} ${card.result.away ?? "—"} — ${teams.home} ${card.result.home ?? "—"}.`;
  }

  if (outcome === "PUSH") {
    return `${selection} finished as a push. Final score: ${teams.away} ${card.result.away ?? "—"} — ${teams.home} ${card.result.home ?? "—"}.`;
  }

  return "Outcome pending.";
}

function confidenceLabel(value?: number | null) {
  if (value === null || value === undefined) return "Pending";
  if (value >= 65) return "Strong";
  if (value >= 60) return "Good";
  if (value >= 58) return "Qualified";
  return "Below threshold";
}

export default function Home() {
  const [payload, setPayload] = useState<Payload>({ cards: [] });
  const [upcoming, setUpcoming] = useState<UpcomingGame[]>([]);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState("");

  async function loadEdges() {
    try {
      const res = await fetch("/api/frontend-edges", { cache: "no-store" });
      const data = await res.json();

      setPayload({
        cards: Array.isArray(data.cards) ? data.cards : [],
        generated_at_utc: data.generated_at_utc || null,
      });

      setLastChecked(new Date().toLocaleTimeString("en-AU", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }));
    } catch {
      setPayload({ cards: [] });
      setLastChecked(new Date().toLocaleTimeString("en-AU"));
    } finally {
      setLoading(false);
    }
  }

  async function loadUpcoming() {
    try {
      const res = await fetch("/api/upcoming-games", { cache: "no-store" });
      const data = await res.json();
      setUpcoming(Array.isArray(data.games) ? data.games : []);
    } catch {
      setUpcoming([]);
    }
  }

  useEffect(() => {
    loadEdges();
    loadUpcoming();

    const timer = setInterval(() => {
      loadEdges();
      loadUpcoming();
    }, 30000);

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
            Trigger-window edge display. Signal cards appear only when the backend exposes a confirmed live alert.
          </p>
        </div>

        <div style={styles.statsBox}>
          <div style={styles.bigNumber}>{cards.length}</div>
          <div style={styles.statsLabel}>active signal{cards.length === 1 ? "" : "s"}</div>
          <div style={styles.tiny}>Auto-refresh every 30s</div>
        </div>
      </section>

      <section style={styles.upcoming}>
        <div style={styles.upcomingHeader}>
          <div>
            <div style={styles.kicker}>SLATE WATCH</div>
            <h2 style={styles.upcomingTitle}>Upcoming Games</h2>
          </div>
          <div style={styles.upcomingCount}>{upcoming.length} waiting</div>
        </div>

        {upcoming.length === 0 ? (
          <div style={styles.upcomingEmpty}>No upcoming games currently loaded.</div>
        ) : (
          <div style={styles.upcomingList}>
            {upcoming.map((g, i) => {
              const isNext = i === 0;
              const mins = g.minutes_to_start ?? null;
              const inTriggerWindow = mins !== null && mins <= 10 && mins >= -20;

              return (
                <div
                  key={`${g.sport}-${g.game}-${i}`}
                  style={{
                    ...styles.upcomingRow,
                    ...(isNext ? styles.upcomingRowNext : {}),
                  }}
                >
                  <div style={styles.upcomingSport}>{g.sport || "GAME"}</div>
                  <div style={styles.upcomingMain}>
                    <strong>{cleanGameName(g.game)}</strong>
                    <span>{fmtTime(g.start_time_local || g.start_time_utc)}</span>
                  </div>
                  <div style={styles.upcomingRight}>
                    <strong>{fmtCountdown(mins)}</strong>
                    <span style={inTriggerWindow ? styles.triggerLive : undefined}>
                      {triggerLabel(mins)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {cards.length === 0 ? (
        <section style={styles.empty}>
          <div style={styles.emptyIcon}>⏳</div>
          <h2 style={styles.emptyTitle}>Waiting for the next edge</h2>
          <p style={styles.emptyText}>
            The backend is monitoring the slate. When a game enters the trigger window and a signal is available,
            a card will appear here automatically.
          </p>

          <div style={styles.emptyGrid}>
            <Info label="Frontend role" value="Reader only" />
            <Info label="Source" value="/api/frontend-edges" />
            <Info label="Last checked" value={lastChecked || (loading ? "Checking..." : "Not available")} />
          </div>
        </section>
      ) : (
        <section style={styles.grid}>
          {cards.map((card) => {
            const isOpen = revealed[card.game_id] ?? true;
            const outcome = outcomeStyle(card.outcome);
            const teams = splitTeams(card.game);
            const primaryMarket = card.markets?.[0];
            const status = statusLabel(card.status);

            return (
              <article key={card.game_id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div>
                    <div style={styles.sport}>{card.sport || "NBA"} SIGNAL</div>
                    <h2 style={styles.game}>{card.game}</h2>
                    <p style={styles.meta}>{fmtTime(card.start_time_local || card.start_time_utc)}</p>
                  </div>

                  <div style={styles.rightStack}>
                    <div style={styles.status}>{status}</div>
                    <div
                      style={{
                        ...styles.outcomePill,
                        color: outcome.color,
                        borderColor: outcome.border,
                        background: outcome.background,
                      }}
                    >
                      {outcome.icon} {outcome.label}
                    </div>
                  </div>
                </div>

                <div style={styles.scorePanel}>
                  <div>
                    <div style={styles.panelLabel}>Final score</div>
                    {card.result ? (
                      <div style={styles.scoreLine}>
                        <span>{teams.away}</span>
                        <strong>{card.result.away ?? "—"}</strong>
                        <span style={styles.scoreDash}>—</span>
                        <strong>{card.result.home ?? "—"}</strong>
                        <span>{teams.home}</span>
                      </div>
                    ) : (
                      <div style={styles.scorePending}>Score pending</div>
                    )}
                  </div>

                  <div style={styles.resultMini}>
                    <span>Signal result</span>
                    <strong style={{ color: outcome.color }}>{outcome.label}</strong>
                  </div>
                </div>

                <div style={styles.signalSummary}>
                  <div>
                    <div style={styles.panelLabel}>Recommended signal</div>
                    <div style={styles.mainSignal}>
                      {primaryMarket ? cleanSelection(primaryMarket.selection) : "Signal pending"}
                    </div>
                  </div>
                  <div style={styles.summaryBadge}>
                    {primaryMarket ? marketTitle(primaryMarket.type) : "Signal"}
                  </div>
                </div>

                <button
                  style={isOpen ? styles.hideButton : styles.revealButton}
                  onClick={() =>
                    setRevealed((prev) => ({
                      ...prev,
                      [card.game_id]: !isOpen,
                    }))
                  }
                >
                  {isOpen ? "Hide details" : "View signal details"}
                </button>

                {isOpen && (
                  <div style={styles.markets}>
                    {card.markets.map((m, idx) => (
                      <div key={`${card.game_id}-${m.type}-${idx}`} style={styles.market}>
                        <div style={styles.marketHeader}>
                          <div>
                            <div style={styles.marketType}>{marketTitle(m.type)}</div>
                            <div style={styles.selection}>{cleanSelection(m.selection)}</div>
                          </div>

                          <div style={styles.confidence}>
                            <strong>{m.confidence != null ? `${m.confidence}%` : "Pending"}</strong>
                            <span>{confidenceLabel(m.confidence)}</span>
                          </div>
                        </div>

                        <div style={styles.detailGrid}>
                          <Metric label="Model edge" value={fmtNumber(m.edge)} />
                          <Metric label="Confidence" value={m.confidence != null ? `${m.confidence}%` : "Pending"} />
                          <Metric label="Outcome" value={outcome.label} color={outcome.color} />
                        </div>

                        <div style={styles.reasonBox}>
                          <span>Why this signal?</span>
                          <p>
                            {m.reason ||
                              "The backend confirmed this signal because the model found a qualifying edge and confidence passed the configured threshold."}
                          </p>
                        </div>

                        <div style={styles.reasonBox}>
                          <span>Result explanation</span>
                          <p>{explainOutcome(card, m)}</p>
                        </div>
                      </div>
                    ))}
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.infoBox}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={styles.metric}>
      <span>{label}</span>
      <strong style={color ? { color } : undefined}>{value}</strong>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 28,
    background: "linear-gradient(180deg, #070b16 0%, #0b1020 100%)",
    color: "#f8fafc",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
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
    fontWeight: 900,
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 44,
    margin: "8px 0 6px",
    letterSpacing: -1.2,
  },
  subtitle: {
    color: "#94a3b8",
    margin: 0,
    fontSize: 16,
    lineHeight: 1.5,
  },
  statsBox: {
    minWidth: 150,
    border: "1px solid #263449",
    borderRadius: 20,
    padding: 18,
    textAlign: "center",
    background: "linear-gradient(180deg, #111827 0%, #0f172a 100%)",
    boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
  },
  bigNumber: {
    fontSize: 36,
    fontWeight: 950,
    lineHeight: 1,
  },
  statsLabel: {
    color: "#e2e8f0",
    fontSize: 13,
    marginTop: 6,
  },
  tiny: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 12,
  },
  upcoming: {
    border: "1px solid #263449",
    background: "linear-gradient(180deg, #101827 0%, #0b1224 100%)",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    boxShadow: "0 20px 50px rgba(0,0,0,0.22)",
  },
  upcomingHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 14,
  },
  upcomingTitle: {
    margin: "6px 0 0",
    fontSize: 26,
    letterSpacing: -0.4,
  },
  upcomingCount: {
    border: "1px solid #334155",
    background: "#020617",
    color: "#cbd5e1",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  upcomingEmpty: {
    border: "1px solid #1e293b",
    background: "#020617",
    borderRadius: 16,
    padding: 16,
    color: "#94a3b8",
  },
  upcomingList: {
    display: "grid",
    gap: 10,
  },
  upcomingRow: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    border: "1px solid #1e293b",
    background: "#020617",
    borderRadius: 16,
    padding: 14,
  },
  upcomingRowNext: {
    borderColor: "rgba(56,189,248,0.55)",
    background: "linear-gradient(90deg, rgba(14,165,233,0.14), #020617)",
  },
  upcomingSport: {
    minWidth: 52,
    color: "#7dd3fc",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 1,
  },
  upcomingMain: {
    flex: 1,
    display: "grid",
    gap: 4,
    minWidth: 0,
  },
  upcomingRight: {
    minWidth: 140,
    display: "grid",
    gap: 4,
    textAlign: "right",
    color: "#cbd5e1",
  },
  triggerLive: {
    color: "#22c55e",
    fontWeight: 900,
  },
  empty: {
    border: "1px solid #1e293b",
    background: "#111827",
    borderRadius: 24,
    padding: 34,
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
    maxWidth: 760,
    lineHeight: 1.65,
  },
  emptyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 12,
    marginTop: 22,
  },
  infoBox: {
    border: "1px solid #263449",
    background: "#0b1224",
    borderRadius: 16,
    padding: 14,
    display: "grid",
    gap: 6,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: 20,
  },
  card: {
    border: "1px solid #263449",
    background: "linear-gradient(180deg, #111827 0%, #0f172a 100%)",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 20px 50px rgba(0,0,0,0.28)",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "flex-start",
  },
  sport: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 1.2,
  },
  game: {
    margin: "8px 0",
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 1.15,
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
    background: "#0b1224",
  },
  outcomePill: {
    border: "1px solid",
    borderRadius: 999,
    padding: "7px 11px",
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
  },
  scorePanel: {
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    background: "#0b1224",
    border: "1px solid #1e293b",
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
  },
  panelLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  scoreLine: {
    display: "flex",
    gap: 9,
    alignItems: "center",
    flexWrap: "wrap",
    color: "#cbd5e1",
  },
  scoreDash: {
    color: "#64748b",
  },
  scorePending: {
    color: "#94a3b8",
    fontWeight: 700,
  },
  resultMini: {
    display: "grid",
    gap: 4,
    textAlign: "right",
    minWidth: 120,
  },
  signalSummary: {
    marginTop: 16,
    padding: 18,
    borderRadius: 18,
    background: "#020617",
    border: "1px solid #334155",
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
  },
  mainSignal: {
    fontSize: 28,
    fontWeight: 950,
    letterSpacing: -0.5,
    lineHeight: 1.1,
  },
  summaryBadge: {
    border: "1px solid #0ea5e9",
    background: "rgba(14,165,233,0.10)",
    color: "#7dd3fc",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
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
    fontWeight: 950,
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
    fontWeight: 950,
    fontSize: 15,
  },
  markets: {
    marginTop: 16,
    display: "grid",
    gap: 14,
  },
  market: {
    border: "1px solid #334155",
    borderRadius: 20,
    padding: 16,
    background: "#020617",
  },
  marketHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
  },
  marketType: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  selection: {
    marginTop: 7,
    fontSize: 25,
    fontWeight: 950,
    letterSpacing: -0.4,
    lineHeight: 1.15,
  },
  confidence: {
    textAlign: "right",
    display: "grid",
    gap: 4,
    minWidth: 100,
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 10,
    marginTop: 16,
  },
  metric: {
    border: "1px solid #1e293b",
    background: "#0b1224",
    borderRadius: 14,
    padding: 13,
    display: "grid",
    gap: 6,
  },
  reasonBox: {
    marginTop: 14,
    padding: 14,
    background: "#0b1224",
    borderRadius: 14,
    color: "#cbd5e1",
    lineHeight: 1.55,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 14,
    color: "#64748b",
    fontSize: 12,
    flexWrap: "wrap",
  },
};
