# TOÁN BÁC LONG – BẢN NÂNG CẤP MÃ NGUỒN (23/10/2026)

## Những gì đã sửa trong bộ ZIP này

1. `index.html`: tách rõ bước tạo tài khoản miễn phí và bước gửi phiếu đăng ký học. Trước đây chỉ gọi `/auth/v1/signup` nhưng hiển thị thông báo đã ghi nhận đăng ký học, trong khi hàm `handle_new_user` hiện chỉ tạo hồ sơ `public.users` và không tạo phiếu `enrollment_requests`. Bản sửa **không còn xác nhận sai**; sau khi tạo tài khoản, có nút dẫn tới `/app/dang-ky-hoc.html` để gửi phiếu thực sự. Người dùng đã có tài khoản không cần đăng ký thêm.
2. `index.html`: bỏ `fetch` gửi họ tên/số điện thoại/email/họ tên bé ra bên thứ ba `formsubmit.co`. Do đó, thông báo email ngoài hệ thống từ form trang chủ **sẽ không còn được gửi**. Đơn đăng ký học được lưu vào Supabase qua trang `/app/dang-ky-hoc.html` và cần được quản trị theo dõi tại `admin.html`.
3. `app/ho-so-hoc-sinh.html`: trang mới cho phụ huynh đăng nhập, thêm/sửa/xem nhiều hồ sơ học sinh trong `public.students`; mọi truy vấn đều lọc `user_id`, quyền RLS hiện hữu bảo vệ ở Database. Không cần sửa Database.
4. `app/bao-cao.html`: thêm đường dẫn quản lý hồ sơ học sinh. Cảnh báo minh bạch báo cáo vẫn là tổng hợp theo tài khoản, chưa phân tách từng bé.
5. Một số trang đăng ký: điều chỉnh thông báo thời hạn liên kết xác minh email vì cấu hình hết hạn do Supabase Auth kiểm soát, không cam kết cứng 1 giờ.

## Kiến trúc giữ nguyên

- Trang web tĩnh GitHub Pages; đăng nhập Supabase Auth; dữ liệu Supabase PostgreSQL; file Supabase Storage; RPC PostgreSQL.
- Không thêm VPS/Node backend, không thêm service role vào Frontend.
- Không đổi tên bảng, không xóa dữ liệu, không sửa quyền học hiện hữu.

## Kiểm thử đã chạy

- Kiểm tra cú pháp 32 khối JavaScript nhúng HTML bằng `node --check`: không có lỗi cú pháp.
- Rà soát các hàm gọi Supabase và khả năng tương thích cấu trúc bảng `students` (`id`,`user_id`,`ten`,`khoi`) và RLS hiện hữu.

## Chưa thể khẳng định đã đạt

- Chưa chạy thử nghiệm đầu-cuối với tài khoản phụ huynh có xác thực email, tài khoản miễn phí và tài khoản trả phí; chưa thử thanh toán thật hay sandbox.
- Chưa triển khai mã nguồn lên GitHub Pages; chỉ cung cấp bản ZIP đã sửa để kiểm thử/merge.
- Chưa chuyển `practice_log`/`attempts` sang `student_id`, nên báo cáo riêng từng học sinh **chưa hỗ trợ**.
- Chưa có cổng thanh toán tự động hoặc webhook xác thực thanh toán. Không quảng bá website đã tự động kích hoạt gói sau khi chuyển tiền.
- Các cảnh báo `SECURITY DEFINER` còn lại cần đánh giá từng RPC, không thu hồi hàng loạt vì có thể làm hỏng chức năng.

## Hướng dẫn triển khai an toàn

1. Sao lưu repository và xác nhận Supabase có bản backup/snapshot phù hợp.
2. Tạo nhánh GitHub `upgrade/commercial-readiness-20261023`, giải nén ZIP rồi so sánh/commit thay đổi lên nhánh; chưa ghi đè `main`.
3. Dùng GitHub Pages bản thử (hoặc môi trường HTTP local với URL xác thực Auth được phép) để kiểm tra trang chủ, đăng ký học, hồ sơ học sinh và báo cáo.
4. Kiểm thử tối thiểu: xác thực email, login/logout, user A không thấy hồ sơ user B, thêm/sửa bé, gửi phiếu đăng ký từ trang riêng, quyền đọc/tải đề bằng anon/free/paid, hết hạn, thi thử, admin.
5. Chỉ merge `main` khi các trường hợp trên đạt. Website live sẽ được GitHub Pages triển khai theo cơ chế CI/CD của repository.

## Tiếp tục thương mại hóa – việc P0 chưa xong

- Xác minh luồng nộp tiền, ghi nhận giao dịch, cấp/thu hồi quyền, chống cấp gói trùng và xử lý hoàn tiền.
- Làm rõ quy định sử dụng, chính sách bảo mật dữ liệu trẻ em và quyền phân phối đề thi gốc.
- Test trực tiếp Storage/RPC với người dùng không đăng nhập, gói hết hạn và gói khác.
- Hoàn thiện chọn học sinh trước mỗi lượt làm bài, sau đó mới phân tách báo cáo cho từng bé.
