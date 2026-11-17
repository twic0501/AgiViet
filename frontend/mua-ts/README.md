# mua-ts/ · App người mua (Vite + TypeScript)

Chạy ở `agiviet.id.vn/mua-ts/`. Một trang, điều hướng bằng `#`: `#hom-nay`, `#nguon`, `#nhu-cau/moi`, `#don`, `#don/<id>`, `#tien`, `#tin`, `#tin/<order|offer>/<id>`.

| Tệp | Việc |
|---|---|
| `index.html` | khung trang, thanh tab |
| `app.css` | giao diện; token màu "Sổ làm ăn" (`../thiet-ke/so-lam-an.css`) |
| `tsconfig.json` | kiểm kiểu (`npm run typecheck`) |
| `src/` | mã nguồn, xem `src/README.md` |

- Dùng chung với app bán, nạp động lúc chạy: thẻ giao dịch `/thiet-ke/the-giao-dich.js`, kênh real-time `/thiet-ke/thoi-gian-thuc.js`.
- Chạy trên máy phải dùng bản build (máy chủ thô không dịch TypeScript):
  `npm run build && AGV_STATIC=dist AGV_TEST_TOOLS=1 API_ORIGIN=http://127.0.0.1:8080 node server.mjs`
- Vercel Web Analytics bật bằng `inject()` trong `src/main.ts` (tự bỏ qua trên localhost).
