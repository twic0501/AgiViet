// Ký số PDF hợp đồng bằng VNPT SmartCA (API SP769, người ký xác nhận trên app SmartCA — AgiViet KHÔNG giữ mật khẩu/TOTP của người ký).
// Luồng theo mã mẫu VNPT (Sample.SmartCA-769-PHP.Curl): lấy chứng thư → calculateHash (VNPT chuẩn bị PDF, trả hash + fileID)
// → sign (hash hex) → người ký xác nhận trên app → hỏi trạng thái → signExternal (VNPT ghép chữ ký, trả PDF đã ký).
// Khóa: VNPT_SMARTCA_SP_ID / VNPT_SMARTCA_SP_PASSWORD (client_id/client_secret cổng đối tác cấp). Địa chỉ: VNPT_SMARTCA_URL.
import { randomUUID } from 'node:crypto';
import { loi } from '../loi.ts';

type Fetch = typeof fetch;
const goc = () => (process.env.VNPT_SMARTCA_URL ?? 'https://rmgateway.vnptit.vn').replace(/\/$/, '');
const khoa = () => {
  const sp_id = process.env.VNPT_SMARTCA_SP_ID, sp_password = process.env.VNPT_SMARTCA_SP_PASSWORD;
  if (!sp_id || !sp_password) throw loi('CHUA_HO_TRO', 'Chưa cấu hình VNPT SmartCA trên máy chủ.');
  return { sp_id, sp_password };
};

async function goi(f: Fetch, duong: string, than: unknown) {
  const r = await f(`${goc()}${duong}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(than), signal: AbortSignal.timeout(30_000) });
  const j: any = await r.json().catch(() => null);
  if (!r.ok || !j) throw loi('LOI_HE_THONG', `VNPT SmartCA trả HTTP ${r.status}.`);
  return j;
}

// shortcut: giao dịch đang chờ giữ trong bộ nhớ, mất khi máy chủ khởi động lại; lên bản thật thì lưu vào bảng riêng.
type Cho = { docId: string; tranId: string; fileID: string; giaoDich: string; xong?: Buffer };
const dangCho = new Map<string, Cho>();

/** Bước 1–3: gửi PDF đi ký. user_id là định danh người ký trên SmartCA (CCCD). Trả mã giao dịch để hỏi lại. */
export async function guiKy(docId: string, pdf: Buffer, userId: string, tenFile: string, f: Fetch = fetch) {
  const k = khoa();
  const ct = await goi(f, '/sca/sp769/v1/credentials/get_certificate', { ...k, user_id: userId, serial_number: '', transaction_id: randomUUID() });
  const cert = ct?.data?.user_certificates?.[0];
  if (!cert?.cert_data) throw loi('KHONG_TIM_THAY', 'Không thấy chứng thư SmartCA của người ký. Kiểm tra đã kích hoạt chứng thư trên app chưa.');
  const h = await goi(f, '/rest/v2/signature/calculateHash', { ...k, transaction_id: randomUUID(), signerCert: cert.cert_data, digestAlgorithm: 'sha256',
    sign_files: [{ storage_file_name: '', name: tenFile, pdfContent: pdf.toString('base64'),
      sigOptions: { renderMode: 0, fontSize: 10, fontColor: '#000000', signatureText: 'Ký số qua VNPT SmartCA', signatures: [{ page: 1, rectangle: '20,20,220,80' }] } }] });
  const hr = h?.hashResps?.[0];
  if (hr?.code !== 'sigSuccess' || !hr.hash) throw loi('LOI_HE_THONG', 'VNPT chưa chuẩn bị được PDF để ký.');
  const hex = Buffer.from(hr.hash, 'base64').toString('hex');
  const s = await goi(f, '/sca/sp769/v1/signatures/sign', { ...k, user_id: userId, transaction_id: randomUUID(), transaction_desc: `AgiViet ky ${tenFile}`,
    serial_number: cert.serial_number, sign_files: [{ data_to_be_signed: hex, doc_id: hex, file_type: 'pdf', sign_type: 'hash' }] });
  if (s?.status_code !== 200 || !s?.data?.transaction_id) throw loi('LOI_HE_THONG', `VNPT chưa nhận yêu cầu ký: ${s?.message ?? 'không rõ'}`);
  const giaoDich = String(s.data.transaction_id);
  dangCho.set(giaoDich, { docId, tranId: h.tranId, fileID: hr.fileID, giaoDich });
  return { giao_dich: giaoDich, trang_thai: 'cho_xac_nhan', cau: 'Mở app VNPT SmartCA trên điện thoại để xác nhận ký.' };
}

/** Bước 4–5: hỏi VNPT; đã ký thì ghép chữ ký vào PDF và trả PDF đã ký (một lần, gọi lại trả lại bản đã ghép). */
export async function kiemKy(docId: string, giaoDich: string, f: Fetch = fetch): Promise<{ trang_thai: string; pdf?: Buffer }> {
  const c = dangCho.get(giaoDich);
  if (!c || c.docId !== docId) throw loi('KHONG_TIM_THAY');
  if (c.xong) return { trang_thai: 'da_ky', pdf: c.xong };
  const r = await goi(f, `/sca/sp769/v1/signatures/sign/${encodeURIComponent(giaoDich)}/status`, {});
  const sig = r?.data?.signatures?.[0]?.signature_value;
  if (!sig) return { trang_thai: 'cho_xac_nhan' };
  const k = khoa();
  const g = await goi(f, '/rest/v2/signature/signExternal', { ...k, tranId: c.tranId, signatures: [{ fileID: c.fileID, signature: sig }] });
  const pdf = g?.signResps?.[0]?.signedData;
  if (!pdf) throw loi('LOI_HE_THONG', 'VNPT chưa ghép được chữ ký vào PDF.');
  c.xong = Buffer.from(pdf, 'base64');
  return { trang_thai: 'da_ky', pdf: c.xong };
}
