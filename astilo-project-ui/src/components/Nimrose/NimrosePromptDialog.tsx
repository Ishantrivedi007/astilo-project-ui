import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface PromptOptions {
  title?: string;
  message?: ReactNode;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface PromptState extends PromptOptions {
  id: number;
  mode: "prompt" | "alert";
}

interface PromptContextValue {
  /** A stylized replacement for window.prompt() — resolves the entered
   * text, or null if cancelled. */
  prompt: (options: PromptOptions) => Promise<string | null>;
  /** A stylized replacement for window.alert() — resolves once dismissed. */
  alertInfo: (message: ReactNode, title?: string) => Promise<void>;
}

const PromptContext = createContext<PromptContextValue | null>(null);

export const NimrosePromptProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<PromptState | null>(null);
  const resolverRef = useRef<((value: string | null) => void) | null>(null);
  const idRef = useRef(0);
  const [value, setValue] = useState("");

  const openPrompt = (options: PromptOptions) =>
    new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
      idRef.current += 1;
      setValue(options.defaultValue ?? "");
      setState({ id: idRef.current, mode: "prompt", ...options });
    });

  const openAlert = (message: ReactNode, title?: string) =>
    new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
      idRef.current += 1;
      setState({ id: idRef.current, mode: "alert", message, title });
    }).then(() => undefined);

  const settle = (result: string | null) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  };

  return (
    <PromptContext.Provider value={{ prompt: openPrompt, alertInfo: openAlert }}>
      {children}
      {state &&
        createPortal(
          <div className="nimrose-modal-overlay" onMouseDown={() => settle(null)}>
            <div
              className="nimrose-prompt-dialog glass-card"
              role="alertdialog"
              aria-modal="true"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {state.title && <h3 className="nimrose-prompt-title">{state.title}</h3>}
              {state.message && <p className="nimrose-prompt-message">{state.message}</p>}
              {state.mode === "prompt" && (
                <input
                  autoFocus
                  className="nimrose-prompt-input"
                  value={value}
                  placeholder={state.placeholder}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") settle(value);
                    if (e.key === "Escape") settle(null);
                  }}
                />
              )}
              <div className="nimrose-prompt-actions">
                {state.mode === "prompt" && (
                  <button type="button" className="nimrose-chip" onClick={() => settle(null)}>
                    {state.cancelLabel ?? "Cancel"}
                  </button>
                )}
                <button
                  type="button"
                  className="nimrose-prompt-confirm"
                  autoFocus={state.mode === "alert"}
                  onClick={() => settle(state.mode === "prompt" ? value : null)}
                >
                  {state.confirmLabel ?? (state.mode === "alert" ? "OK" : "Create")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </PromptContext.Provider>
  );
};

export const useNimrosePrompt = () => {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error("useNimrosePrompt must be used within NimrosePromptProvider");
  return ctx;
};
