import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus } from "lucide-react";

import { useConfirm } from "../../shared";
import {
  addProjectMember,
  fetchProjectMembers,
  removeProjectMember,
  updateProjectMemberRole,
  type ProjectMemberRole,
} from "../../../lib/nimroseApi";

const ROLES: ProjectMemberRole[] = ["viewer", "editor", "owner"];

/** The Project Workspace hub's Team tab — real shared access, not just a
 * roster: adding someone here actually grants them view/edit rights on
 * this project's tasks/notes/tickets/calendar/files, enforced server-side. */
const WorkspaceTeamPanel = ({ projectId }: { projectId: number }) => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectMemberRole>("editor");

  const membersQuery = useQuery({
    queryKey: ["nimrose", "project-members", projectId],
    queryFn: () => fetchProjectMembers(projectId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "project-members", projectId] });

  const addMutation = useMutation({
    mutationFn: addProjectMember,
    onSuccess: () => {
      invalidate();
      setEmail("");
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: ProjectMemberRole }) => updateProjectMemberRole(id, role),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: removeProjectMember,
    onSuccess: invalidate,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    addMutation.mutate({ projectId, email: trimmed, role });
  };

  const members = membersQuery.data ?? [];

  return (
    <div className="nimrose-workspace-panel-body">
      <form className="nimrose-task-form glass-card" onSubmit={submit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@email.com"
          aria-label="Invite by email"
        />
        <select value={role} onChange={(e) => setRole(e.target.value as ProjectMemberRole)} aria-label="Role">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button type="submit" disabled={addMutation.isPending}>
          <UserPlus size={14} /> Invite
        </button>
      </form>
      {addMutation.isError && (
        <p className="nimrose-widget-empty">
          {(addMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Couldn't add that member."}
        </p>
      )}

      {membersQuery.isLoading && <p className="nimrose-widget-empty">Loading members…</p>}
      {!membersQuery.isLoading && members.length === 0 && <p className="nimrose-widget-empty">Just you so far.</p>}
      <ul className="nimrose-workspace-list">
        {members.map((member) => (
          <li key={member.id} className="nimrose-workspace-list-item">
            <span className="nimrose-workspace-list-title">{member.userName ?? member.userEmail}</span>
            <select
              value={member.role}
              onChange={(e) => roleMutation.mutate({ id: member.id, role: e.target.value as ProjectMemberRole })}
              aria-label="Change role"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="nimrose-icon-btn"
              onClick={async () => {
                const ok = await confirm({
                  title: "Remove member?",
                  message: `Remove ${member.userName ?? member.userEmail} from this project?`,
                  confirmLabel: "Remove",
                  danger: true,
                });
                if (ok) removeMutation.mutate(member.id);
              }}
              aria-label="Remove member"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WorkspaceTeamPanel;
