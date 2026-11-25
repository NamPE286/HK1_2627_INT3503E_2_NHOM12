import { Link, useParams } from "react-router";

/** FE-02: TipTap + extension legalHeading (Chương/Mục/Điều/Khoản/Điểm) — xem ai-rules/10 §10.4. */
export function EditorPage() {
  const { documentId } = useParams();
  return (
    <section>
      <Link to={`/documents/${documentId}`} className="muted small">‹ Quay lại văn bản</Link>
      <h1>Soạn thảo văn bản</h1>
      <div className="card placeholder">
        <p><strong>Đang phát triển (FE-02 / API-04).</strong> Trình soạn thảo TipTap với toolbar chèn header
          <em> Chương · Mục · Điều · Khoản · Điểm</em>, tự đánh số (Điều liên tục; Khoản 1, 2…; Điểm a, b, c, d, đ…),
          lưu bằng <code>PUT /legal-documents/{"{id}"}/content</code> kèm <code>If-Match</code>. Với dự thảo: gắn <em>chỉ dẫn thay đổi</em> (sửa đổi, bổ sung, thay thế, bãi bỏ) tới điều khoản hiện hành rồi xem <em>báo cáo tác động</em>.</p>
      </div>
    </section>
  );
}
