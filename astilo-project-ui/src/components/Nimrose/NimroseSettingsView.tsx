import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Palette } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useConfirm } from "../shared";
import { DEFAULT_NEW_TAB_URL_KEY } from "./NimroseBrowserView";
import { DEFAULT_PRESET_KEY, FOCUS_PRESETS } from "./NimroseFocusContext";

const readLocal = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

const writeLocal = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

const LOCAL_DATA_KEYS = [
  { key: "nimrose-focus-sessions-completed", label: "Focus session count" },
  { key: "nimrose-home-widgets-v1", label: "Home widget layout" },
];

const NimroseSettingsView = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [defaultTabUrl, setDefaultTabUrl] = useState(() => readLocal(DEFAULT_NEW_TAB_URL_KEY, "https://"));
  const [defaultPreset, setDefaultPreset] = useState(() => Number(readLocal(DEFAULT_PRESET_KEY, "0")));

  return (
    <div>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">System</p>
          <h1 className="nimrose-page-title">Settings</h1>
        </div>
      </div>

      <div className="glass-card nimrose-settings-section">
        <p className="nimrose-modal-section-title">Browser</p>
        <label className="nimrose-settings-row">
          <span>Default URL for new tabs</span>
          <input
            value={defaultTabUrl}
            onChange={(e) => setDefaultTabUrl(e.target.value)}
            onBlur={() => writeLocal(DEFAULT_NEW_TAB_URL_KEY, defaultTabUrl)}
          />
        </label>
      </div>

      <div className="glass-card nimrose-settings-section">
        <p className="nimrose-modal-section-title">Focus</p>
        <label className="nimrose-settings-row">
          <span>Default timer preset</span>
          <select
            value={defaultPreset}
            onChange={(e) => {
              const value = Number(e.target.value);
              setDefaultPreset(value);
              writeLocal(DEFAULT_PRESET_KEY, String(value));
            }}
          >
            {FOCUS_PRESETS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <p className="nimrose-widget-footnote">Applies the next time you open Nimrose (the current running timer is unaffected).</p>
      </div>

      <div className="glass-card nimrose-settings-section">
        <p className="nimrose-modal-section-title">Themes</p>
        <p className="nimrose-widget-footnote" style={{ marginBottom: "0.6rem" }}>
          Nimrose follows Astilo's app-wide theme rather than having its own — change it from Customize.
        </p>
        <button type="button" className="nimrose-chip" onClick={() => navigate(AppRoute.customize)}>
          <Palette size={12} /> Open Customize
        </button>
      </div>

      <div className="glass-card nimrose-settings-section">
        <p className="nimrose-modal-section-title">Local data</p>
        <p className="nimrose-widget-footnote" style={{ marginBottom: "0.6rem" }}>
          These live only in this browser (not synced to your account) — Tasks, Notes, Kanban and
          Calendar are stored on the server and unaffected by this.
        </p>
        <div className="nimrose-full-task-meta">
          {LOCAL_DATA_KEYS.map((item) => (
            <button
              key={item.key}
              type="button"
              className="nimrose-chip"
              onClick={async () => {
                const ok = await confirm({
                  title: `Clear ${item.label}?`,
                  message: "This can't be undone.",
                  confirmLabel: "Clear",
                  danger: true,
                });
                if (ok) {
                  try {
                    localStorage.removeItem(item.key);
                    window.location.reload();
                  } catch {
                    /* ignore */
                  }
                }
              }}
            >
              Clear {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NimroseSettingsView;
