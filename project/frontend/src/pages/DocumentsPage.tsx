import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { CreateDocumentForm } from "../features/documents/CreateDocumentForm";
import { useWorkspace } from "../features/workspaces/current";
import { api, type DocumentKind, type DocumentStatus } from "../lib/api/client";
import { DOC_TYPE_LABELS, KIND_LABELS, STATUS_LABELS } from "../lib/labels";

const PAGE_SIZE = 10;
const KIND_TABS: { value: DocumentKind | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "IN_FORCE", label: "Văn bản hiện hành" },
  { value: "DRAFT", label: "Dự thảo" },
];

export function DocumentsPage() {
  const { workspaceId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const workspace = useWorkspace(workspaceId);
  const page = Number(params.get("page") ?? 1);
  const q = params.get("q") ?? "";
  const kind = (params.get("kind") ?? "") as DocumentKind | "";
  const status = (params.get("status") ?? "") as DocumentStatus | "";
  const isOwner = workspace.data?.my_role === "OWNER";

  const { data, isPending, error } = useQuery({
    queryKey: ["documents", workspaceId, { page, q, kind, status }],
    queryFn: () =>
      api.listDocuments(workspaceId, {
        page, page_size: PAGE_SIZE, q: q || undefined, kind: kind || undefined, status: status || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const update = (next: Record<string, string>) => {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) v ? merged.set(k, v) : merged.delete(k);
    setParams(merged);
  };

  if (workspace.error) return <div className="alert">{workspace.error.message}</div>;

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{workspace.data?.name ?? "Workspace"}</h1>
          <p className="muted">
            {isOwner
              ? "Văn bản hiện hành và dự thảo của bạn. Chia sẻ quyền xem cho người thẩm định ở mục Chia sẻ."
              : workspace.data && `Được ${workspace.data.owner.display_name} chia sẻ — bạn chỉ có quyền xem.`}
          </p>
        </div>
        {isOwner && !creating && <button className="btn primary" onClick={() => setCreating(true)}>+ Văn bản mới</button>}
        {workspace.data && !isOwner && <span className="badge readonly">Chỉ xem</span>}
      </div>

      {creating && <CreateDocumentForm workspaceId={workspaceId} onDone={() => setCreating(false)} />}

      <div className="tabs" role="tablist">
        {KIND_TABS.map((t) => (
          <button key={t.value} role="tab" aria-selected={kind === t.value}
                  className={`tab ${kind === t.value ? "active" : ""}`}
                  onClick={() => update({ kind: t.value, page: "" })}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Tìm theo số hiệu hoặc trích yếu…"
          defaultValue={q}
          onKeyDown={(e) => e.key === "Enter" && update({ q: e.currentTarget.value, page: "" })}
        />
        <select value={status} onChange={(e) => update({ status: e.target.value, page: "" })}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {error && <div className="alert">{error.message}</div>}
      {isPending ? (
        <p className="muted">Đang tải…</p>
      ) : data && data.data.length === 0 ? (
        <div className="empty card">
          <p>Chưa có văn bản nào{q || status || kind ? " khớp bộ lọc" : ""}.</p>
          {isOwner && !q && !status && !kind && (
            <button className="btn primary" onClick={() => setCreating(true)}>Thêm văn bản đầu tiên</button>
          )}
        </div>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr><th>Số hiệu</th><th>Trích yếu</th><th>Loại</th><th>Ban hành</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>
              {data?.data.map((d) => (
                <tr key={d.id}>
                  <td className="nowrap"><Link to={`/documents/${d.id}`}>{d.number}</Link></td>
                  <td>
                    {d.title}
                    {d.kind === "DRAFT" && <span className="badge draft-kind">{KIND_LABELS.DRAFT}</span>}
                  </td>
                  <td className="nowrap">{DOC_TYPE_LABELS[d.doc_type]}</td>
                  <td className="nowrap">{d.issued_date ?? "—"}</td>
                  <td><span className={`badge ${d.status.toLowerCase()}`}>{STATUS_LABELS[d.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pagination.total_pages > 1 && (
        <div className="pager">
          <button className="btn ghost" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>‹ Trước</button>
          <span>Trang {page}/{data.pagination.total_pages} · {data.pagination.total_items} văn bản</span>
          <button className="btn ghost" disabled={page >= data.pagination.total_pages}
                  onClick={() => update({ page: String(page + 1) })}>Sau ›</button>
        </div>
      )}
    </section>
  );
}
