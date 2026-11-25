import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, ApiProblem, type DocumentStatus } from "../lib/api/client";
import { DOC_TYPE_LABELS, formatBytes, STATUS_LABELS } from "../lib/labels";

export function DocumentDetailPage() {
  const { documentId = "" } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const doc = useQuery({ queryKey: ["documents", documentId], queryFn: () => api.getDocument(documentId) });
  const files = useQuery({ queryKey: ["documents", documentId, "files"], queryFn: () => api.listSourceFiles(documentId) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["documents"] });
  const onError = (err: unknown) => setMessage(err instanceof ApiProblem ? err.message : "Có lỗi xảy ra.");

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadSourceFile(documentId, file),
    onSuccess: () => { setMessage("Đã upload file."); refresh(); },
    onError,
  });
  const transition = useMutation({
    mutationFn: (status: DocumentStatus) => api.updateDocument(documentId, { status }, doc.data?.version),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: () => api.deleteDocument(documentId),
    onSuccess: () => { refresh(); navigate("/documents"); },
    onError,
  });
  const removeFile = useMutation({ mutationFn: api.deleteSourceFile, onSuccess: refresh, onError });

  if (doc.isPending) return <p className="muted">Đang tải…</p>;
  if (doc.error) return <div className="alert">{doc.error.message} <Link to="/documents">Quay lại</Link></div>;
  const d = doc.data;
  const isDraft = d.status === "DRAFT";

  return (
    <section>
      <Link to="/documents" className="muted small">‹ Văn bản của tôi</Link>
      <div className="page-head">
        <div>
          <h1>{DOC_TYPE_LABELS[d.doc_type]} {d.number}</h1>
          <p>{d.title}</p>
        </div>
        <span className={`badge ${d.status.toLowerCase()}`}>{STATUS_LABELS[d.status]}</span>
      </div>

      <div className="card meta">
        <div><span className="muted">Cơ quan ban hành</span>{d.issuer}</div>
        <div><span className="muted">Ngày ban hành</span>{d.issued_date ?? "—"}</div>
        <div><span className="muted">Ngày hiệu lực</span>{d.effective_date ?? "—"}</div>
        <div><span className="muted">Phiên bản</span>v{d.version}</div>
      </div>

      <div className="actions">
        <Link className="btn" to={`/documents/${d.id}/editor`}>Soạn thảo Điều/Khoản/Điểm</Link>
        {isDraft && <button className="btn primary" onClick={() => transition.mutate("PUBLISHED")}>Xuất bản</button>}
        {d.status === "PUBLISHED" && <button className="btn" onClick={() => transition.mutate("ARCHIVED")}>Lưu trữ</button>}
        {isDraft && (
          <button className="btn danger" onClick={() => confirm("Xoá văn bản nháp này?") && remove.mutate()}>Xoá</button>
        )}
      </div>
      {message && <div className="alert info" role="status">{message}</div>}

      <div className="page-head">
        <h2>File gốc</h2>
        {isDraft && (
          <>
            <input ref={fileInput} type="file" hidden accept=".pdf,.docx,.txt"
                   onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
            <button className="btn" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
              {upload.isPending ? "Đang upload…" : "Upload file"}
            </button>
          </>
        )}
      </div>
      {files.data?.data.length ? (
        <ul className="files card">
          {files.data.data.map((f) => (
            <li key={f.id}>
              <span className="badge">{f.format.toUpperCase()}</span>
              <a href={api.sourceFileUrl(f.id)}>{f.original_filename}</a>
              <span className="muted small">{formatBytes(f.size_bytes)} · {new Date(f.created_at).toLocaleString("vi-VN")}</span>
              <button className="btn ghost small" onClick={() => removeFile.mutate(f.id)}>Xoá</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Chưa có file. {isDraft ? "Upload PDF/DOCX/TXT của văn bản gốc." : ""}</p>
      )}
    </section>
  );
}
