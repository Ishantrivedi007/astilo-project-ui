import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import GradientButton from "./GradientButton";
import "./ConfirmDialog.scss";

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (red) instead of the default gradient. */
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  id: number;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const idRef = useRef(0);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      idRef.current += 1;
      setState({ id: idRef.current, ...options });
    });
  }, []);

  const settle = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state &&
        createPortal(
          <div className="confirm-overlay" onMouseDown={() => settle(false)}>
            <div
              className="confirm-dialog glass-card"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {state.title && (
                <h3 id="confirm-dialog-title" className="confirm-dialog-title">
                  {state.title}
                </h3>
              )}
              <p className="confirm-dialog-message">{state.message}</p>
              <div className="confirm-dialog-actions">
                <button
                  type="button"
                  className="confirm-dialog-cancel"
                  onClick={() => settle(false)}
                  autoFocus
                >
                  {state.cancelLabel ?? "Cancel"}
                </button>
                {state.danger ? (
                  <button
                    type="button"
                    className="confirm-dialog-danger"
                    onClick={() => settle(true)}
                  >
                    {state.confirmLabel ?? "Confirm"}
                  </button>
                ) : (
                  <GradientButton size="sm" radius="full" onPress={() => settle(true)}>
                    {state.confirmLabel ?? "Confirm"}
                  </GradientButton>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
};

/** Returns an async confirm(options) that resolves true/false — a stylized
 * replacement for window.confirm() used throughout the app. */
export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within a ConfirmProvider");
  return ctx;
};
