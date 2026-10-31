// Phiên 16: "chụp trong app" do server quyết (Codex rà Đăng bài #6), không tin cờ client.
import { SDT } from './khung.ts';
import { them } from './tinh-huong.ts';
import { anhMoi } from './luong.ts';

them('TH-ANH-CHUP', 'Ảnh lô: ảnh mới mới tính chụp trong app; ảnh trùng, PDF không tính; sai loại tệp bị từ chối', async (may, th) => {
  const nam = await may.dangNhap(SDT.nam);
  const lot = await may.v<string>(`SELECT l.id FROM core.lots l JOIN core.organizations o ON o.id=l.seller_org_id WHERE o.code='TC-B01' AND l.status='on_sale' ORDER BY l.code LIMIT 1`);
  const anh = anhMoi();
  const a1 = await nam.ok('/v1/files', { mime: 'image/png', data_base64: anh, entity: 'lot', entity_id: lot, captured_in_app: true });
  th.bang('Ảnh mới: tính chụp trong app', a1.data.captured_in_app, true);
  const a2 = await nam.ok('/v1/files', { mime: 'image/png', data_base64: anh, entity: 'lot', entity_id: lot, captured_in_app: true });
  th.bang('Gửi lại đúng ảnh đó: không tính', a2.data.captured_in_app, false);
  th.kiem('Có lý do ảnh cũ', /đã có trên hệ thống/.test(a2.data.ly_do || ''), a2);
  th.bang('DB lưu cờ server quyết', await may.v<boolean>(`SELECT captured_in_app FROM core.documents WHERE id=$1`, [a2.data.id]), false);
  const pdf = Buffer.from('%PDF-1.4\n' + crypto.randomUUID() + '\n%%EOF').toString('base64');
  const a3 = await nam.ok('/v1/files', { mime: 'application/pdf', data_base64: pdf, entity: 'lot', entity_id: lot, captured_in_app: true });
  th.bang('PDF khai chụp trong app: không tính', a3.data.captured_in_app, false);
  const gia = await nam.post('/v1/files', { mime: 'image/jpeg', data_base64: anhMoi(), entity: 'lot', entity_id: lot, captured_in_app: true });
  th.bang('Khai JPEG nhưng nội dung PNG: 422', gia.status, 422);
});
