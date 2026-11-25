import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CreateDocumentForm } from "../features/documents/CreateDocumentForm";
import { api, type DocumentStatus } from "../lib/api/client";
import { DOC_TYPE_LABELS, STATUS_LABELS } from "../lib/labels";

const PAGE_SIZE = 10;

export function DocumentsPage() {
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const page = Number(params.get("page") ?? 1);
  const q = params.get("q") ?? "";
  const status = (params.get("status") ?? "") as DocumentStatus | "";

  const { data, isPending, error } = useQuery({
    queryKey: ["documents", { page, q, status }],
    queryFn: () => api.listDocuments({ page, page_size: PAGE_SIZE, q: q || undefined, status: status || undefined }),
    placeholderData: keepPreviousData,
  });

  const update = (next: Record<string, string>) => {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) v ? merged.set(k, v) : merged.delete(k);
    setParams(merged);
  };

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Văn bản của tôi</h1>
          <p className="muted">Workspace riêng — chỉ bạn thấy các văn bản và file đã upload.</p>
        </div>
        {!creating && <button className="btn primary" onClick={() => setCreating(true)}>+ Văn bản mới</button>}
      </div>

      {creating && <CreateDocumentForm onDone={() => setCreating(false)} />}

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
          <p>Chưa có văn bản nào{q || status ? " khớp bộ lọc" : ""}.</p>
          {!q && !status && <button className="btn primary" onClick={() => setCreating(true)}>Tạo văn bản đầu tiên</button>}
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
                  <td>{d.title}</td>
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
