import { useNavigate } from "react-router-dom";
import { ArrowLeft, TerminalSquare } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import TerminalPanel from "./TerminalPanel";
import "./Code.scss";

const TerminalView = () => {
  const navigate = useNavigate();

  return (
    <div className="code-page">
      <button type="button" className="nimrose-chip mb-4" onClick={() => navigate(AppRoute.code)}>
        <ArrowLeft size={12} /> Code
      </button>

      <div className="nimrose-home-header">
        <div>
          <p className="code-eyebrow">Astilo Code</p>
          <h1 className="code-title" style={{ fontSize: "1.5rem" }}>
            <TerminalSquare size={20} style={{ display: "inline", verticalAlign: "-3px", marginRight: 8 }} />
            Terminal
          </h1>
        </div>
      </div>

      <TerminalPanel compact height="65vh" />
    </div>
  );
};

export default TerminalView;
