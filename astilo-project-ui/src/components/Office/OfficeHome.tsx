import { useNavigate } from "react-router-dom";
import { FileText, Grid3x3, Presentation } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import "./Office.scss";

const TILES = [
  {
    key: "word",
    label: "Word",
    icon: FileText,
    href: AppRoute.officeWord,
    className: "office-hub-tile--word",
    desc: "Rich-text documents — headings, lists, links, images, charts.",
  },
  {
    key: "excel",
    label: "Excel",
    icon: Grid3x3,
    href: AppRoute.officeExcel,
    className: "office-hub-tile--excel",
    desc: "Spreadsheets with a real editable grid, SUM formulas, and CSV export.",
  },
  {
    key: "slides",
    label: "PowerPoint",
    icon: Presentation,
    href: AppRoute.officeSlides,
    className: "office-hub-tile--slides",
    desc: "Slide decks — add/reorder slides, rich content per slide, present full-screen.",
  },
];

const OfficeHome = () => {
  const navigate = useNavigate();
  return (
    <div className="office-page">
      <p className="office-eyebrow">✦ Astilo Office</p>
      <h1 className="office-title">Documents, sheets &amp; slides</h1>
      <p className="office-tagline">
        A lightweight office suite built into Astilo's — full CRUD, no external app needed. Choose what to
        create or open.
      </p>

      <div className="office-hub-grid">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} type="button" className={`office-hub-tile ${t.className}`} onClick={() => navigate(t.href)}>
              <span className="office-hub-icon">
                <Icon size={22} />
              </span>
              <h3>{t.label}</h3>
              <p>{t.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OfficeHome;
