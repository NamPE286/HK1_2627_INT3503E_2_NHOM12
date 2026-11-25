/** FE-04: canvas React Flow — node DOCUMENT/PROVISION/NOTE, edge AMENDS/SUPPLEMENTS/REPLACES/REPEALS/REFERENCES (ai-rules/10 §10.5). */
export function DiagramsPage() {
  return (
    <section>
      <h1>Lược đồ</h1>
      <div className="card placeholder">
        <p><strong>Đang phát triển (FE-04 / API-08).</strong> Vẽ lược đồ tác động của dự thảo tới văn bản và điều khoản hiện hành:
          kéo thả node, nối cạnh <em>sửa đổi / bổ sung / thay thế / bãi bỏ / dẫn chiếu</em>, có thể khởi tạo từ báo cáo tác động; lưu bằng
          <code> PATCH /diagrams/{"{id}"}</code> kèm <code>If-Match</code>. Người được chia sẻ chỉ xem lược đồ.</p>
      </div>
    </section>
  );
}
