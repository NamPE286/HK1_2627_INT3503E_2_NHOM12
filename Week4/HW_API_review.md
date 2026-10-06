## API đánh giá: GitHub REST API (v3 / 2022-11-28)

### 1. Tài nguyên là danh từ

- Trạng thái: Đạt.
- Lý do: Các URL chỉ sử dụng danh từ (repos, issues, user). Các hành động (tạo mới, lấy dữ liệu) hoàn toàn giao cho HTTP Method (POST, GET), không xuất hiện động từ như `/getIssues` trong path.
  - Ví dụ: `GET /repos/{owner}/{repo}/issues` hoặc `POST /user/repos`
- Đánh giá tùy biến: Tuân thủ đúng nguyên tắc REST cốt lõi, không có ngoại lệ.
- Mức độ ảnh hưởng nếu sai phạm: Nghiêm trọng.
  - Việc chèn động từ vào URL sẽ phá toàn bộ kiến trúc hướng tài nguyên, biến API thành tập hợp các hàm RPC lộn xộn.

### 2. Naming nhất quán

- Trạng thái: Đạt.
- Lý do: Path luôn dùng chữ thường (lowercase) và kebab-case (`/search/code`). Các tham số truy vấn (`query`) dùng chuẩn snake_case (`per_page`). Các danh từ tập hợp luôn ở dạng số nhiều (`/users`, `/repos`).
  - Ví dụ: `GET /search/code?q=test&per_page=10`
- Đánh giá tùy biến: Nhất quán xuyên suốt toàn bộ tài liệu API.
- Mức độ ảnh hưởng nếu sai phạm: Trung bình.
  - Sai phạm không làm chết hệ thống nhưng gây ức chế lớn cho lập trình viên tích hợp do phải liên tục tra cứu tài liệu để đoán tên biến.

### 2. Naming nhất quán

- Trạng thái: Đạt.
- Lý do: Path luôn dùng chữ thường (lowercase) và kebab-case (/search/code). Các tham số truy vấn (query) dùng chuẩn snake_case (per_page). Các danh từ tập hợp luôn ở dạng số nhiều (/users, /repos). Ví dụ: `GET /search/code?q=test&per_page=10`
- Đánh giá tùy biến: Nhất quán xuyên suốt toàn bộ tài liệu API.
- Mức độ ảnh hưởng nếu sai phạm: Trung bình. Sai phạm không làm chết hệ thống nhưng gây ức chế lớn cho lập trình viên tích hợp do phải liên tục tra cứu tài liệu để đoán tên biến.

### 3. Status code đúng nghĩa

- Trạng thái: Đạt.
- Lý do: Dải mã phản hồi sử dụng đúng ngữ nghĩa. Không có hiện tượng gói một lỗi nghiệp vụ vào bên trong mã 200 OK.
  + Tạo issue thành công trả 201 Created. 
  + Xóa repo trả 204 No Content. 
  + Gọi API vượt quá giới hạn trả 403 Forbidden (hoặc 429).
- Đánh giá tùy biến: GitHub đôi khi sử dụng 403 Forbidden thay vì 429 Too Many Requests cho lỗi vượt quá Rate Limit ở một số endpoint cũ. Là điểm trừ nhỏ nhưng nó vẫn nằm trong dải 4xx.
- Mức độ ảnh hưởng nếu sai phạm: Nghiêm trọng. Các Gateway hoặc thư viện client sẽ không thể tự động kích hoạt logic thử lại (retry) hoặc phân loại lỗi tự động nếu mã HTTP không chuẩn.
