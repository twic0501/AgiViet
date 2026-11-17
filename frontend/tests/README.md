# tests/ · Kiểm thử frontend

| Lệnh | Gồm |
|---|---|
| `npm test` | unit `*.test.mjs` (node --test): API, định dạng, lỗi biểu mẫu, ngoại tuyến, tiền ảo… |
| `npm run check` | `lint` (ESLint hai app) + `typecheck` (tsc hai app) + `npm test` |
| `node tests/e2e-luong-chinh.mjs` | E2E đầu-cuối trên giao diện: chào giá → hợp đồng → ký OTP → cọc → giao → nghiệm thu → quyết toán (15 bước) |
| `node tests/e2e-tien-ich-ban.mjs` | E2E tiện ích app bán: nhật ký, vườn, mùa vụ (15 bước) |
| `node tests/kiem-trung-lop.mjs`, `node tests/soat-giao-dien.mjs <thư mục ảnh>` | trùng tên lớp CSS; soát giao diện (nút gãy dòng, vùng chạm, chữ nhỏ, mã thô) |

E2E chỉ chạy trên cặp dịch vụ cô lập 18980/18990 (không đụng bản thật):

```sh
cd backend && AGV_BAO_TIEU=1 AGV_TRA_TRUOC_CHUA_KIEM=1 AGV_TRA_SAU=1 AGV_MOI_TRUONG=thu PORT=18980 npx tsx src/server.ts
cd frontend && npm run build && AGV_TEST_TOOLS=1 AGV_STATIC=dist API_ORIGIN=http://127.0.0.1:18980 PORT=18990 node server.mjs
API_ORIGIN=http://127.0.0.1:18980 FRONTEND_URL=http://127.0.0.1:18990 node tests/e2e-luong-chinh.mjs
```

Ảnh từng bước lưu ở `/tmp/agv-e2e-anh/` (đổi bằng `E2E_SHOT_DIR`). Kiểm thử luồng điều khoản, liên lạc, ẩn danh với đối tác AI nằm ở `backend/test/kiem-*.mjs`.
