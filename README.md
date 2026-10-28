# Portfolio freelance · Đinh Ngọc Định

Trang tĩnh (HTML + CSS + JS), không cần build. Animation dùng GSAP + ScrollTrigger và Lenis, tải từ jsDelivr.

```
index.html          nội dung trang
css/style.css       giao diện, theme sáng / tối
js/main.js          animation và tương tác
assets/shots/       ảnh chụp các dự án (desktop, toàn trang, mobile)
assets/og.jpg       ảnh hiện ra khi chia sẻ link qua Zalo / Facebook
tools/capture/      script chụp ảnh dự án (không deploy)
```

## Xem thử trên máy

```bash
npx http-server -p 5173 -c-1
```

Mở http://localhost:5173

## Deploy lên Vercel

```bash
npx vercel --prod
```

`.vercelignore` đã loại thư mục `tools/` và `.claude/`, nên chỉ trang web được đưa lên.

Sau khi có tên miền, sửa thẻ `og:image` trong `index.html` thành đường dẫn đầy đủ, ví dụ
`https://ten-mien-cua-ban.vercel.app/assets/og.jpg`. Facebook và Zalo chỉ đọc được ảnh chia sẻ khi có đường dẫn đầy đủ.

## Thêm hoặc đổi một dự án

1. Trong `index.html`, sao chép một khối `<article class="project">` rồi sửa:
   - `--hue` là sắc màu của thẻ (0 đỏ hồng, 90 vàng, 150 xanh lá, 250 xanh dương, 285 tím)
   - `--i` là thứ tự bắt đầu từ 0, dùng để xếp chồng thẻ
   - số thứ tự `01/07`, tên, mô tả, 3 điểm nổi bật, link, tên miền trên thanh trình duyệt, tên file ảnh
2. Chụp ảnh cho dự án mới: thêm `{ slug, url }` vào mảng `SITES` trong `tools/capture/capture.mjs`, rồi chạy:

```bash
cd tools/capture
npm install
npm run capture -- ten-slug
```

Script cần Google Chrome ở `C:/Program Files/Google/Chrome/Application/chrome.exe`. Nếu Chrome nằm ở chỗ khác, đặt biến môi trường `CHROME_PATH`.

Muốn chụp lại ảnh chia sẻ `og.jpg`, bật server xem thử như trên rồi chạy `npm run og` trong `tools/capture`.

## Nội dung nên tự kiểm tra lại

Các câu dưới đây là cam kết với khách, nên chỉnh cho đúng cách bạn làm việc:

- Phần "Vì sao chọn mình" và "Hỏi đáp": hỗ trợ sau bàn giao, thời gian làm, hosting miễn phí
- Phần "Gói dịch vụ": nội dung từng gói. Giá đang để "Liên hệ báo giá"
- Huy hiệu "Đang nhận dự án mới" ở đầu trang
