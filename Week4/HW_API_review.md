# Đánh giá GitHub REST API (v3 / 2022-11-28) (Peer-Review)

## 1. Tài nguyên là danh từ

- Trạng thái: Đạt.
- Lý do: Các URL chỉ sử dụng danh từ (repos, issues, user). Các hành động (tạo mới, lấy dữ liệu) hoàn toàn giao cho HTTP Method (POST, GET), không xuất hiện động từ như `/getIssues` trong path.
  - Ví dụ: `GET /repos/{owner}/{repo}/issues` hoặc `POST /user/repos`
- Đánh giá tùy biến: Tuân thủ đúng nguyên tắc REST cốt lõi, không có ngoại lệ.
- Mức độ ảnh hưởng nếu sai phạm: Nghiêm trọng.
  - Việc chèn động từ vào URL sẽ phá toàn bộ kiến trúc hướng tài nguyên, biến API thành tập hợp các hàm RPC lộn xộn.

## 2. Naming nhất quán

- Trạng thái: Đạt.
- Lý do: Path luôn dùng chữ thường (lowercase) và kebab-case (`/search/code`). Các tham số truy vấn (`query`) dùng chuẩn snake_case (`per_page`). Các danh từ tập hợp luôn ở dạng số nhiều (`/users`, `/repos`).
  - Ví dụ: `GET /search/code?q=test&per_page=10`
- Đánh giá tùy biến: Nhất quán xuyên suốt toàn bộ tài liệu API.
- Mức độ ảnh hưởng nếu sai phạm: Trung bình.
  - Sai phạm không làm chết hệ thống nhưng gây ức chế lớn cho lập trình viên tích hợp do phải liên tục tra cứu tài liệu để đoán tên biến.

## 3. Status code đúng nghĩa

- Trạng thái: Đạt.
- Lý do: Dải mã phản hồi sử dụng đúng ngữ nghĩa. Không có hiện tượng gói một lỗi nghiệp vụ vào bên trong mã 200 OK.
  + Tạo issue thành công trả 201 Created. 
  + Xóa repo trả 204 No Content. 
  + Gọi API vượt quá giới hạn trả 403 Forbidden (hoặc 429).
- Đánh giá tùy biến: GitHub đôi khi sử dụng 403 Forbidden thay vì 429 Too Many Requests cho lỗi vượt quá Rate Limit ở một số endpoint cũ. Là điểm trừ nhỏ nhưng nó vẫn nằm trong dải 4xx.
- Mức độ ảnh hưởng nếu sai phạm: Nghiêm trọng. Các Gateway hoặc thư viện client sẽ không thể tự động kích hoạt logic thử lại (retry) hoặc phân loại lỗi tự động nếu mã HTTP không chuẩn.

## 4. Idempotency rõ ràng

- Trạng thái: Không đạt.
- Lý do: Github không có cơ chế hoặc tài liệu nào yêu cầu client cung cấp header Idempotency-Key khi thực hiện POST. Ví dụ: Endpoint `POST /repos/{owner}/{repo}/issues` (tạo issue)
- Đánh giá tùy biến: Không có tùy biến. Nếu xảy ra lỗi mạng khiến client không nhận được phản hồi và tự động thử lại (retry) lệnh POST, hệ thống sẽ tạo ra hai issue trùng lặp hoàn toàn.
- Mức độ ảnh hưởng nếu sai phạm: Cao. Gây ra rác dữ liệu trên diện rộng.

## 5. Error response có cấu trúc

## 6. Pagination rõ ràng

## 7. Filter/Sort đa dạng

- Trạng thái: Không đạt toàn phần (Có Filter/Sort, nhưng thiếu Sparse Fieldsets).
- Lý do: REST API của GitHub bắt buộc trả về toàn bộ payload tĩnh cho một đối tượng.
  + Đạt về Filter và Sort: API hỗ trợ lọc và sắp xếp khá linh hoạt. Ví dụ, endpoint `GET /search/repositories?q=tetris&sort=stars&order=desc` cho phép tìm kiếm repository theo từ khóa, sắp xếp theo số lượng sao (stars).
  + Không về Sparse Fieldsets: Không có cách nào truyền `?fields=id,name` để chỉ lấy 2 trường này trên REST API.
- Đánh giá tùy biến: Chấp nhận được về mặt chiến lược. Thay vì nhồi nhét Sparse Fieldsets vào REST, GitHub tạo hẳn một GraphQL API độc lập chuyên giải quyết bài toán truy vấn trường dữ liệu cụ thể.
- Mức độ ảnh hưởng nếu sai phạm: Trung bình. Gây lãng phí băng thông mạng đối với các thiết bị di động khi phải tải các trường dữ liệu không bao giờ hiển thị.

## 8. Authentication & security

- Trạng thái: Đạt.
- Lý do: Không có bất kỳ token hay API key nào được phép nằm trong chuỗi URL query. Rate limit được công khai minh bạch qua các header `x-ratelimit-limit`, `x-ratelimit-remaining`. Github truyền token qua header `Authorization: Bearer <token>`.
- Đánh giá tùy biến: Áp dụng chuẩn.
- Mức độ ảnh hưởng nếu sai phạm: Rất nghiêm trọng. Token trên URL dễ bị lộ qua log mạng hoặc lịch sử trình duyệt, dẫn đến chiếm đoạt tài khoản.

## 9. Versioning + deprecation

- Trạng thái: Đạt.
- Lý do: Github quản lý phiên bản cực kỳ chặt chẽ dựa trên ngày tháng (Date-based versioning). Hệ thống tài liệu có chu kỳ thông báo dừng hoạt động (deprecation) rõ ràng. Yêu cầu header `X-GitHub-Api-Version: 2022-11-28` trong mọi request.
- Đánh giá tùy biến: Github nhét version vào Header thay vì cho thẳng vào URL (như `/v3/`) là một phong cách nâng cao nhằm giữ URL hoàn toàn trung thành với định danh tài nguyên thuần túy.
- Mức độ ảnh hưởng nếu sai phạm: Cao. Không có versioning ngay từ đầu sẽ đẩy API vào thế không thể nâng cấp hoặc sửa lỗi cấu trúc mãnh liệt mà không phá vỡ client đang hoạt động.
