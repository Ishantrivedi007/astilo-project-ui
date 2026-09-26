import { useNavigate } from "react-router-dom";
import { FileCode2, TerminalSquare, Database, Send } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import "./Code.scss";

const CodeHome = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const tiles = [
    {
      key: "editor",
      label: "Editor",
      icon: FileCode2,
      href: AppRoute.officeCode,
      desc: "Write and save code files with real syntax highlighting (Monaco), a theme picker, and local version history.",
      locked: false,
    },
    {
      key: "terminal",
      label: "Terminal",
      icon: TerminalSquare,
      href: AppRoute.codeTerminal,
      desc: "Run shell commands in a shared, restricted sandbox directory on the server. Admin-only.",
      locked: !isAdmin,
    },
    {
      key: "api-studio",
      label: "API Studio",
      icon: Send,
      href: AppRoute.codeApiStudio,
      desc: "Build and send HTTP requests, save them for later — a lightweight Postman built in.",
      locked: false,
    },
    {
      key: "database",
      label: "Database",
      icon: Database,
      href: AppRoute.codeDatabase,
      desc: "Connect to any database by connection string, browse tables, and run SQL. Admin-only.",
      locked: !isAdmin,
    },
  ];

  return (
    <div className="code-page">
      <p className="code-eyebrow">✦ Astilo Code</p>
      <h1 className="code-title">Write, run, connect</h1>
      <p className="code-tagline">
        A code editor with real syntax highlighting, an HTTP client, a database browser, and an admin
        terminal — all built into Astilo's, no external app needed.
      </p>

      <div className="code-hub-grid">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              className="code-hub-tile"
              onClick={() => navigate(t.href)}
              disabled={t.locked}
              style={t.locked ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
            >
              <span className="code-hub-icon">
                <Icon size={20} />
              </span>
              <h3>
                {t.label} {t.locked && <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>(admin only)</span>}
              </h3>
              <p>{t.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CodeHome;
