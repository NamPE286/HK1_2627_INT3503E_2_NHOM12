import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useParams } from "react-router";
import { useWorkspace } from "../features/workspaces/current";
import { useSession } from "../lib/auth-client";
import { api, ApiProblem } from "../lib/api/client";
import { ROLE_LABELS } from "../lib/labels";

/** Chia sẻ workspace với quyền chỉ xem (VIEWER). Chỉ chủ workspace được mời / thu hồi. */
export function MembersPage() {
  const { workspaceId = "" } = useParams();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const workspace = useWorkspace(workspaceId);
  const members = useQuery({ queryKey: ["members", workspaceId], queryFn: () => api.listMembers(workspaceId) });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const isOwner = workspace.data?.my_role === "OWNER";
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["members", workspaceId] });
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  };
  const onError = (err: unknown) => setMessage({ ok: false, text: err instanceof ApiProblem ? err.message : "Có lỗi xảy ra." });

  const share = useMutation({
    mutationFn: (email: string) => api.shareWorkspace(workspaceId, email),
    onSuccess: (m) => { setMessage({ ok: true, text: `Đã chia sẻ quyền xem cho ${m.user.display_name}.` }); refresh(); },
    onError,
  });
  const revoke = useMutation({
    mutationFn: (userId: string) => api.revokeMember(workspaceId, userId),
    onSuccess: refresh,
    onError,
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const form = e.currentTarget;
    share.mutate(String(new FormData(form).get("email")).trim(), { onSuccess: () => form.reset() });
  };

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Chia sẻ workspace</h1>
          <p className="muted">Người được chia sẻ xem được văn bản, dự thảo và lược đồ nhưng không sửa được.</p>
        </div>
      </div>

      {isOwner && (
        <form className="card share-form" onSubmit={onSubmit}>
          <label className="grow">
            Email người thẩm định / góp ý (đã có tài khoản)
            <input name="email" type="email" required placeholder="ten@example.com" />
          </label>
          <button className="btn primary" disabled={share.isPending}>{share.isPending ? "Đang chia sẻ…" : "Chia sẻ quyền xem"}</button>
        </form>
      )}
      {message && <div className={`alert ${message.ok ? "info" : ""}`} role="status">{message.text}</div>}

      <div className="table-wrap card">
        <table>
          <thead><tr><th>Thành viên</th><th>Email</th><th>Quyền</th><th></th></tr></thead>
          <tbody>
            {members.data?.data.map((m) => {
              const isMe = m.user.id === session?.user.id;
              const canRemove = m.role !== "OWNER" && (isOwner || isMe);
              return (
                <tr key={m.user.id}>
                  <td>{m.user.display_name}{isMe ? " (bạn)" : ""}</td>
                  <td>{m.user.email}</td>
                  <td><span className={`badge ${m.role === "OWNER" ? "finalized" : "readonly"}`}>{ROLE_LABELS[m.role]}</span></td>
                  <td className="nowrap">
                    {canRemove && (
                      <button className="btn ghost small" onClick={() => revoke.mutate(m.user.id)}>
                        {isMe ? "Rời workspace" : "Thu hồi"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
