import { formatDownloadSpeed } from "../../lib/musicApi";
import { useDownloads } from "./DownloadsContext";
import "./DownloadTray.scss";

const STATUS_LABEL: Record<string, string> = {
  starting: "Starting…",
  downloading: "Downloading…",
  processing: "Almost there — mixing the final bits…",
};

const DownloadTray = () => {
  const { activeJobs, dismiss } = useDownloads();

  if (activeJobs.length === 0) return null;

  return (
    <div className="download-tray">
      {activeJobs.map((job) => (
        <div key={job.id} className="download-tray-item">
          <div className="download-tray-head">
            <span className="download-tray-icon" aria-hidden>
              {job.format === "video" ? "🎬" : "🎵"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {job.title || "Downloading…"}
              </p>
              <p className="truncate text-xs text-ink/50">
                {job.artist || STATUS_LABEL[job.status] || job.status}
                {formatDownloadSpeed(job.speedBytesPerSec) && ` · ${formatDownloadSpeed(job.speedBytesPerSec)}`}
              </p>
            </div>
            <span className="download-tray-pct">{job.progress}%</span>
            <button
              type="button"
              onClick={() => dismiss(job.id)}
              className="download-tray-close"
              aria-label="Dismiss"
              title="Hide (download continues in the background)"
            >
              ✕
            </button>
          </div>
          <div className="download-tray-bar">
            <div className="download-tray-fill" style={{ width: `${job.progress}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default DownloadTray;
