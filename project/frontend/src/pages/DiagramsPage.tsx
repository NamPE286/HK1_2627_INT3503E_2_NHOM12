/** FE-04: canvas React Flow — node DOCUMENT/PROVISION/VIOLATION/NOTE, edge AMENDS/REPLACES/… (ai-rules/10 §10.5). */
export function DiagramsPage() {
  return (
    <section>
      <h1>Lược đồ</h1>
      <div className="card placeholder">
        <p><strong>Đang phát triển (FE-04 / API-08).</strong> Vẽ thủ công lược đồ quan hệ văn bản – điều khoản – hành vi:
          kéo thả node, nối cạnh <em>sửa đổi / thay thế / bãi bỏ / dẫn chiếu</em>, lưu bằng
          <code> PATCH /diagrams/{"{id}"}</code> kèm <code>If-Match</code>. Lược đồ thuộc workspace riêng của bạn.</p>
      </div>
    </section>
  );
}
