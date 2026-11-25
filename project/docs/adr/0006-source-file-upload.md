# ADR 0006 — Upload file gốc của văn bản

- Trạng thái: Accepted · Ngày: 2026-11-25

## Quyết định
- Sub-resource `POST /legal-documents/{document_id}/source-files` (`multipart/form-data`, field `file`); item phẳng
  `/source-files/{file_id}` và `/source-files/{file_id}/content` (giữ độ sâu ≤ 2 cấp).
- Tách bước "tạo metadata văn bản" (JSON) và "upload file" (multipart) thay vì một request multipart gộp:
  JSON giữ validation/contract rõ ràng; upload có thể lặp lại, nhiều file, retry độc lập.
- Whitelist PDF/DOCX/TXT, ≤ 20 MB, kiểm tra **magic bytes**; SHA-256 chống trùng trong cùng văn bản (409).
- Nội dung lưu qua interface `FileStorage` (đĩa cục bộ / volume Docker), DB giữ metadata. Đổi sang S3/R2 không đổi API.

## Hệ quả
- Client cần 2 request để tạo văn bản có file (frontend gộp trong một form).
- Trích xuất Điều/Khoản/Điểm từ file (LLM, như repo gốc) để ngoài 1.0.0; sẽ là job bất đồng bộ `202 Accepted`.
