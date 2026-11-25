# ADR 0004 — Mô hình content của trình soạn thảo

- Trạng thái: Accepted · Ngày: 2026-11-25

## Bối cảnh
Chức năng soạn thảo cần chèn header Điều/Khoản/Điểm. Có hai cách: (a) cây lồng nhau (Điều chứa Khoản chứa Điểm) ngay trong
editor; (b) danh sách phẳng các block, header là một node `legalHeading` có `level`.

## Quyết định
Chọn **(b) danh sách phẳng** trong JSON TipTap. Server parse tuần tự, dựng cây bằng stack theo `level`, chuẩn hoá số thứ
tự, sinh `provisions` với `path` ổn định. Provision là **dẫn xuất chỉ đọc** qua API.

## Lý do
- Thao tác soạn thảo tự nhiên (gõ, cắt/dán, kéo thả đoạn) không bị ràng buộc cây cứng của ProseMirror.
- Lỗi cấu trúc (Khoản ngoài Điều) được báo bằng 422 kèm vị trí block thay vì editor chặn thao tác.
- Một nguồn sự thật (content) ⇒ không lệch giữa văn bản hiển thị và provision.

## Hệ quả
- Mỗi lần PUT phải re-parse toàn văn bản (O(n), chấp nhận được với văn bản < 2 MB).
- Giữ ổn định `provision.id` theo `path` để chế tài không gãy khi sửa văn bản; renumber có thể đổi path ⇒ server trả
  `409 RESOURCE_IN_USE` nếu provision đang được tham chiếu bị đổi/xoá (editor cảnh báo trước).
