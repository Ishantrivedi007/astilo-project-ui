import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { TerminalSquare, Trash2 } from "lucide-react";

import { runTerminalCommand } from "../../lib/codeApi";
import { extractApiErrorMessage } from "../../lib/apiError";
import "./Code.scss";

interface LogEntry {
  id: string;
  command: string;
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  durationMs: number;
}

export interface TerminalPanelHandle {
  /** Runs a command as if the user typed it — used by the Code Editor's
   * Run button. Switches the panel's cwd first if one is given. */
  runCommand: (command: string, cwd?: string) => void;
}

interface TerminalPanelProps {
  height?: string;
  /** Hides the "Clear" button + heading row for the embedded (Code Editor)
   * use — the standalone Terminal page supplies its own page header instead. */
  compact?: boolean;
}

/** The actual terminal UI + state, shared by the standalone Terminal page
 * (Code/TerminalView.tsx) and the Code Editor's embedded panel. Not a real
 * PTY — one request/response per command, run in a shared, restricted
 * sandbox directory on the server (see code_controller.py's
 * TerminalController). No container isolation: an admin here can still
 * reach the rest of the host, same as config.py's CODE_TERMINAL_ENABLED
 * docstring says. */
const TerminalPanel = forwardRef<TerminalPanelHandle, TerminalPanelProps>(({ height = "65vh", compact = false }, ref) => {
  const [cwd, setCwd] = useState("");
  const [input, setInput] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  const [disabledMessage, setDisabledMessage] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cwdRef = useRef(cwd);
  cwdRef.current = cwd;

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [log]);

  const runMutation = useMutation({
    mutationFn: ({ command, cwd: runCwd }: { command: string; cwd: string }) => runTerminalCommand(command, runCwd),
    onSuccess: (result, { command }) => {
      setCwd(result.cwd);
      setLog((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          command,
          cwd: result.cwd,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          durationMs: result.durationMs,
        },
      ]);
    },
    onError: (err, { command }) => {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setDisabledMessage("Terminal is disabled on this server. Set CODE_TERMINAL_ENABLED=true in the backend's .env to enable it.");
        return;
      }
      setLog((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          command,
          cwd: cwdRef.current,
          stdout: "",
          stderr: extractApiErrorMessage(err, "Command failed."),
          exitCode: null,
          timedOut: false,
          durationMs: 0,
        },
      ]);
    },
  });

  const runCommand = (command: string, nextCwd?: string) => {
    if (!command.trim() || runMutation.isPending) return;
    const effectiveCwd = nextCwd !== undefined ? nextCwd : cwdRef.current;
    if (nextCwd !== undefined) setCwd(nextCwd);
    setHistory((prev) => [...prev, command]);
    setHistoryIdx(null);
    runMutation.mutate({ command, cwd: effectiveCwd });
  };

  useImperativeHandle(ref, () => ({ runCommand }));

  const submit = () => {
    const command = input.trim();
    if (!command) return;
    setInput("");
    runCommand(command);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIdx === null ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInput(history[nextIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx === null) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= history.length) {
        setHistoryIdx(null);
        setInput("");
      } else {
        setHistoryIdx(nextIdx);
        setInput(history[nextIdx]);
      }
    }
  };

  return (
    <div>
      {!compact && (
        <div className="nimrose-home-header">
          <p className="code-eyebrow" style={{ margin: 0 }}>
            Terminal
          </p>
          <button type="button" className="nimrose-chip" onClick={() => setLog([])} disabled={log.length === 0}>
            <Trash2 size={12} /> Clear
          </button>
        </div>
      )}

      {disabledMessage && (
        <div className="code-disabled-banner">
          <TerminalSquare size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{disabledMessage}</span>
        </div>
      )}

      <div className="code-terminal" style={{ height }} onClick={() => inputRef.current?.focus()}>
        <div className="code-terminal-output" ref={outputRef}>
          <div className="code-terminal-line-meta">Sandbox: /{cwd || "."} — commands run on the server, not your browser.</div>
          {log.map((entry) => (
            <div key={entry.id} style={{ marginTop: "0.6rem" }}>
              <div className="code-terminal-line-cmd">
                /{entry.cwd} $ {entry.command}
              </div>
              {entry.stdout && <div>{entry.stdout}</div>}
              {entry.stderr && <div className="code-terminal-line-err">{entry.stderr}</div>}
              {entry.timedOut && <div className="code-terminal-line-err">(timed out)</div>}
              <div className="code-terminal-line-meta">
                {entry.exitCode !== null ? `exit ${entry.exitCode} · ` : ""}
                {entry.durationMs}ms
              </div>
            </div>
          ))}
          {log.length === 0 && !disabledMessage && <div className="code-terminal-line-meta">Type a command below and press Enter.</div>}
        </div>
        <div className="code-terminal-input-row">
          <span className="code-terminal-prompt">/{cwd || "."} $</span>
          <input
            ref={inputRef}
            className="code-terminal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={runMutation.isPending ? "running…" : "command…"}
            disabled={runMutation.isPending}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
});

TerminalPanel.displayName = "TerminalPanel";

export default TerminalPanel;
