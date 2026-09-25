import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, Upload } from "lucide-react";

import { useConfirm } from "../../shared";
import {
  attachmentFileUrl,
  deleteProjectAttachment,
  fetchProjectAttachments,
  uploadProjectAttachment,
} from "../../../lib/kanbanApi";

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const WorkspaceFilesPanel = ({ projectId }: { projectId: number }) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);

  const filesQuery = useQuery({
    queryKey: ["nimrose", "project-attachments", projectId],
    queryFn: () => fetchProjectAttachments(projectId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "project-attachments", projectId] });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProjectAttachment(projectId, file),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: number) => deleteProjectAttachment(projectId, attachmentId),
    onSuccess: invalidate,
  });

  const files = filesQuery.data ?? [];

  return (
    <div className="nimrose-workspace-panel-body">
      <input
        ref={inputRef}
        type="file"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadMutation.mutate(file);
          e.target.value = "";
        }}
      />
      <button type="button" className="nimrose-chip" onClick={() => inputRef.current?.click()} disabled={uploadMutation.isPending}>
        <Upload size={12} /> {uploadMutation.isPending ? "Uploading…" : "Upload file"}
      </button>

      {filesQuery.isLoading && <p className="nimrose-widget-empty">Loading files…</p>}
      {!filesQuery.isLoading && files.length === 0 && <p className="nimrose-widget-empty">No files yet.</p>}
      <ul className="nimrose-workspace-list">
        {files.map((file) => (
          <li key={file.id} className="nimrose-workspace-list-item">
            <FileText size={12} />
            <a className="nimrose-workspace-list-title" href={attachmentFileUrl(file)} target="_blank" rel="noreferrer">
              {file.fileName}
            </a>
            <span className="nimrose-workspace-list-meta">{formatSize(file.sizeBytes)}</span>
            <button
              type="button"
              className="nimrose-icon-btn"
              onClick={async () => {
                const ok = await confirm({ title: "Delete file?", message: `Delete "${file.fileName}"?`, confirmLabel: "Delete", danger: true });
                if (ok) deleteMutation.mutate(file.id);
              }}
              aria-label="Delete file"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WorkspaceFilesPanel;
