# W4 - Tasks API 

## 1. Yêu cầu hệ thống:
- Python >= 3.10

## 2. Thiết lập và chạy:

1. Kích hoạt môi trường ảo:
- Windows: 
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
- Linux/Mac: 
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
    ```
3. Cài đặt thư viện (flask):
   ```bash
   pip install -r requirements.txt
   # Kiểm tra:
   flask --version
   ```

4. Khởi động file python theo bài tương ứng:
   ```bash
   python <Bài số x>.py
   ```

5. Mở terminal khác và test với `curl` (theo ví dụ trong các ảnh kết quả)
- Windows: 
   ```bash
   cmd.exe /c 'curl.exe <request>'
    ```
- Linux/Mac:
   ```bash
   $ curl <request>
    ```

## 3. Bài toán:
API Quản lý task nội bộ

1. SourceCodes triển khai:

- OpenAPI Specification đặc tả cho API:
[openapi.yaml](/W4/tasks-api/openapi.yaml) 

- App triển khai Swagger UI có Database on Ram test thực thi và có tách `/openapi.json` cho Specification + `/docs` cho Swagger UI:
[app.py](/W4/tasks-api/app.py)

2. Thực hiện test Local:

- Khởi động app:
   ```bash
   python app.py
   ```

- Truy cập xem Specification(json): [openapi](http://localhost:5000/openapi.json)

- Truy cập Swagger UI và test: [UI](http://localhost:5000/docs)
