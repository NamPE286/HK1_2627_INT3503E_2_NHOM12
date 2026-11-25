# 11 — Business rules nghiệp vụ pháp lý

> Rút gọn từ SRS của dự án gốc (`NamPE286/INT3011E_6`) cho phạm vi môn học. Chi tiết: `docs/02-requirements.md`.

## 11.1 Phạm vi
- Chỉ **xử phạt vi phạm hành chính** trong lĩnh vực **giao thông đường bộ**. Ngoài phạm vi: hình sự, dân sự,
  tư vấn pháp lý cho trường hợp cụ thể.
- Hệ thống là công cụ tra cứu/biên tập, **không thay thế** cơ sở dữ liệu văn bản chính thức (vbpl.vn).

## 11.1b Workspace (MUST)
- Mỗi tài khoản là một **instance riêng**: tự nhập văn bản, upload file gốc, soạn Điều/Khoản/Điểm, gắn chế tài, vẽ lược đồ.
  Không có kho văn bản dùng chung trong 1.0.0; hai tài khoản có thể nhập cùng một số hiệu văn bản.
- "Xuất bản" (`PUBLISHED`) nghĩa là **chốt bản chính thức trong workspace** (khoá sửa nội dung), không phải công khai.

## 11.2 Cấu trúc văn bản (MUST — editor & server validate giống nhau)
Cấp bậc: `CHAPTER` (Chương, số La Mã I, II…) → `SECTION` (Mục, 1, 2…) → `ARTICLE` (Điều) → `CLAUSE` (Khoản) → `POINT` (Điểm).
- `ARTICLE` có thể nằm trực tiếp dưới gốc, dưới `CHAPTER` hoặc `SECTION`. `SECTION` chỉ nằm trong `CHAPTER`.
- `CLAUSE` **bắt buộc** nằm trong `ARTICLE`. `POINT` **bắt buộc** nằm trong `CLAUSE`.
- Đánh số:
  - Chương: I, II, III… liên tục toàn văn bản. Mục: 1, 2… reset theo Chương.
  - **Điều: 1, 2, 3… liên tục toàn văn bản** (không reset theo Chương).
  - Khoản: 1, 2, 3… reset theo Điều.
  - Điểm: `a, b, c, d, đ, e, g, h, i, k, l, m, n, o, p, q, r, s, t, u, v, x, y` (bảng chữ cái tiếng Việt,
    không có `f, j, w, z`) reset theo Khoản.
- Nhãn hiển thị: `Điều 6. <tiêu đề>`, `Khoản 4`, `Điểm a`. Trích dẫn chuẩn: `điểm a khoản 4 Điều 6 Nghị định 168/2024/NĐ-CP`.
- `path` của provision: `dieu-6/khoan-4/diem-a` (Chương/Mục không vào path trích dẫn).
- Mỗi lần `PUT content` hợp lệ: tạo `document_revision` mới, tái sinh bảng `provisions`. Provision giữ `id` ổn định
  nếu `path` không đổi (để chế tài đang trỏ tới không bị gãy). Provision bị xoá mà đang được `sanction_rule` tham chiếu
  ⇒ `409 RESOURCE_IN_USE` (trừ khi văn bản còn DRAFT và rule cũng DRAFT).

## 11.3 Trạng thái văn bản (state machine)
```
DRAFT ──(publish)──► PUBLISHED ──(archive)──► ARCHIVED
  ▲                            │
  └──────(không cho phép)──────┘
```
- Chỉ `DRAFT` được sửa content, upload file gốc và xoá. `PUBLISHED` chỉ sửa `expiry_date`.
- Publish yêu cầu: có `number`, `issued_date`, `effective_date`, content hợp lệ, ≥ 1 Điều.
- Chuyển trạng thái sai ⇒ `409 INVALID_STATE_TRANSITION`.

## 11.4 Hành vi vi phạm & chế tài
- **Hành vi (Violation)** là danh tính nghiệp vụ độc lập với điều khoản: một hành vi có thể được quy định bởi nhiều
  điều khoản ở nhiều văn bản theo thời gian. Định danh bởi `slug` + `name`, không gồm mức phạt/ngày hiệu lực.
- **Chế tài (SanctionRule)** gắn `violation_id` + `provision_id` (nguồn pháp lý, **bắt buộc**) + `vehicle_type`
  (`CAR`, `MOTORBIKE`, `TRACTOR`, `BICYCLE`, `PEDESTRIAN`, `OTHER`).
- Mức phạt tiền: `fine_min_vnd ≤ fine_max_vnd`, số nguyên ≥ 0 ⇒ sai: `422 INVALID_FINE_RANGE`.
- Trừ điểm GPLX: `point_deduction_applicability ∈ {APPLIES, NOT_APPLICABLE, UNKNOWN}`;
  `points_deducted` bắt buộc khi `APPLIES` (1–12), phải `null` khi khác. **Không suy ra `NOT_APPLICABLE` từ `null`.**
- Hình phạt bổ sung: danh sách `additional_sanctions[]` loại `LICENSE_SUSPENSION` (kèm `duration_months_min/max`),
  `VEHICLE_CONFISCATION`, `OTHER` (kèm `description`). Biện pháp khắc phục: `remedial_measures[]` (text).
- Hiệu lực: `effective_from` (bắt buộc) ≤ `effective_to` (nullable = chưa hết hiệu lực).
  Với cùng `violation_id` + `vehicle_type` (= một **lineage**), các khoảng hiệu lực **không được chồng lấn** ⇒ `422 INVALID_EFFECTIVE_INTERVAL`.
- Trạng thái tính toán `status` tại ngày `as_of` (mặc định hôm nay): `CURRENT` nếu `effective_from ≤ as_of < effective_to|∞`,
  `SUPERSEDED` nếu đã hết hiệu lực, `UPCOMING` nếu chưa có hiệu lực. Không có dữ liệu ⇒ không suy ra `CURRENT`.
- Chế tài chỉ trỏ tới provision **cùng workspace**.

## 11.5 Quan hệ văn bản
- `relation_type ∈ {AMENDS, SUPPLEMENTS, REPLACES, REPEALS, REFERENCES, GUIDES}`; có hướng `source → target`
  (vd NĐ 168/2024 `REPLACES` NĐ 100/2019). Không cho `source == target`; không trùng bộ (source, target, type).
- Có thể kèm `source_provision_id`/`target_provision_id` (sửa đổi ở mức Điều/Khoản).

## 11.6 Lược đồ (Diagram)
- Là tài liệu **cá nhân do người dùng vẽ tay**, không phải nguồn pháp lý; không tự động tạo `document_relations`.
- Node tham chiếu (`ref_type` + `ref_id`) tới tài nguyên không tồn tại ⇒ vẫn lưu nhưng đánh dấu `broken_ref: true` khi đọc.
- Lược đồ thuộc workspace (không chia sẻ công khai trong 1.0.0).

## 11.6b File gốc
- Mỗi văn bản DRAFT có thể có nhiều file gốc (PDF/DOCX/TXT ≤ 20 MB); trùng SHA-256 trong cùng văn bản ⇒ 409.
- File gốc là bằng chứng nguồn; trích xuất tự động sang Điều/Khoản/Điểm (LLM như repo gốc) nằm ngoài 1.0.0.

## 11.7 Dữ liệu mẫu
- Seed dùng văn bản thật (vd Nghị định 168/2024/NĐ-CP, 100/2019/NĐ-CP) **chỉ trích đoạn ngắn**, ghi nguồn vbpl.vn,
  hoặc dữ liệu giả đánh dấu `is_sample: true`. Không bịa số hiệu văn bản trông như thật.
