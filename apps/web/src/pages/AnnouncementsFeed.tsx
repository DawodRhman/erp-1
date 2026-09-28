import React from "react";
import { CheckCircle2, Megaphone } from "lucide-react";
import { useAnnouncements } from "../hooks/useAnnouncements";

function formatDate(value?: string) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AnnouncementsFeed() {
  const { announcements, isLoading, isError, markRead } = useAnnouncements({ active: true });

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">Announcements</div>
          <div className="pg-sub">Official organization updates from the backend announcement feed.</div>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--t3)" }}>
            Loading announcements...
          </div>
        ) : isError ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--red)" }}>
            Could not load announcements.
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--t3)" }}>
            <Megaphone size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>No announcements are published right now.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {announcements.map((post) => (
              <article
                key={post.id}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: "1px solid var(--br2)",
                  background: "linear-gradient(180deg, rgba(255,255,255,.92), rgba(248,250,252,.78))",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17, color: "var(--t1)" }}>{post.title}</h3>
                    <div style={{ marginTop: 4, fontSize: 11, color: "var(--t3)" }}>
                      Published {formatDate(post.created_at)}
                    </div>
                  </div>
                  {post.is_read ? (
                    <span className="pill green" style={{ alignSelf: "flex-start", display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <CheckCircle2 size={14} /> Read
                    </span>
                  ) : (
                    <button
                      className="btn btn-sm"
                      onClick={() => markRead.mutate(post.id)}
                      disabled={markRead.isPending}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
                <p style={{ color: "var(--t2)", lineHeight: 1.6, margin: "12px 0 0" }}>{post.body}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
