import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { api, ApiProblem, type DocType, type DocumentKind, type LegalDocumentCreate } from "../../lib/api/client";
import { DOC_TYPE_LABELS, KIND_LABELS } from "../../lib/labels";

/** Thêm văn bản hiện hành hoặc tạo dự thảo + (tuỳ chọn) upload file gốc ngay sau khi tạo. */
export function CreateDocumentForm({ workspaceId, onDone }: { workspaceId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ body, file }: { body: LegalDocumentCreate; file: File | null }) => {
      const doc = await api.createDocument(workspaceId, body);
      if (file) await api.uploadSourceFile(doc.id, file);
      return doc;
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      onDone();
      navigate(`/documents/${doc.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiProblem) {
        const fields = err.problem.errors?.map((e) => e.field).filter(Boolean).join(", ");
        setError(fields ? `${err.message} (${fields})` : err.message);
      } else setError("Không thể tạo văn bản.");
    },
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const opt = (k: string) => (String(f.get(k) ?? "") || null);
    const file = f.get("file");
    mutation.mutate({
      body: {
        kind: String(f.get("kind")) as DocumentKind,
        doc_type: String(f.get("doc_type")) as DocType,
        number: String(f.get("number")).trim(),
        title: String(f.get("title")).trim(),
        issuer: String(f.get("issuer")).trim(),
        issued_date: opt("issued_date"),
        effective_date: opt("effective_date"),
      },
      file: file instanceof File && file.size > 0 ? file : null,
    });
  };

  return (
    <form className="card form-grid" onSubmit={onSubmit}>
      <h3>Văn bản mới</h3>
      <label>
        Là
        <select name="kind" defaultValue="IN_FORCE">
          {Object.entries(KIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label>
        Loại văn bản
        <select name="doc_type" defaultValue="NGHI_DINH">
          {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label>
        Số hiệu
        <input name="number" required maxLength={80} placeholder="168/2024/NĐ-CP hoặc [Dự thảo] …" />
      </label>
      <label className="span-2">
        Trích yếu
        <input name="title" required maxLength={500} placeholder="Trích yếu văn bản / tên dự thảo" />
      </label>
      <label>
        Cơ quan ban hành
        <input name="issuer" required maxLength={200} placeholder="Chính phủ / cơ quan chủ trì soạn thảo" />
      </label>
      <label>
        Ngày ban hành
        <input name="issued_date" type="date" />
      </label>
      <label>
        Ngày hiệu lực
        <input name="effective_date" type="date" />
      </label>
      <label>
        File gốc (PDF / DOCX / TXT, ≤ 20 MB)
        <input name="file" type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain" />
      </label>
      {error && <div className="alert span-2" role="alert">{error}</div>}
      <div className="actions span-2">
        <button type="button" className="btn ghost" onClick={onDone}>Huỷ</button>
        <button className="btn primary" disabled={mutation.isPending}>
          {mutation.isPending ? "Đang lưu…" : "Tạo văn bản"}
        </button>
      </div>
    </form>
  );
}
