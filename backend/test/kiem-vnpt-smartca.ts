// Kiểm luồng ký SmartCA với VNPT giả lập: `npx tsx test/kiem-vnpt-smartca.ts` (thoát 1 nếu sai).
// Kiểm: đúng thứ tự API, hash base64→hex, chưa xác nhận thì chờ, xác nhận rồi ghép đúng chữ ký, giao dịch gắn đúng tài liệu.
import assert from 'node:assert';
import { guiKy, kiemKy } from '../src/nghiep-vu/vnpt-smartca.ts';

process.env.VNPT_SMARTCA_SP_ID = 'sp-gia'; process.env.VNPT_SMARTCA_SP_PASSWORD = 'mk-gia'; process.env.VNPT_SMARTCA_URL = 'https://vnpt.gia';
const goi: { duong: string; than: any }[] = [];
let daXacNhan = false;
const f: any = async (url: string, o: any) => {
  const duong = url.replace('https://vnpt.gia', ''), than = JSON.parse(o.body); goi.push({ duong, than });
  const tl = (x: unknown) => new Response(JSON.stringify(x));
  if (duong.endsWith('/get_certificate')) return tl({ status_code: 200, data: { user_certificates: [{ serial_number: 'SER1', cert_data: 'CERT64' }] } });
  if (duong.endsWith('/calculateHash')) return tl({ tranId: 'T1', hashResps: [{ code: 'sigSuccess', hash: Buffer.from([0xab, 0xcd]).toString('base64'), fileID: 'F1' }] });
  if (duong.endsWith('/signatures/sign')) return tl({ status_code: 200, message: 'sig_wait_for_user_confirm', data: { transaction_id: 'GD1' } });
  if (duong.includes('/status')) return tl({ status_code: 200, message: daXacNhan ? 'SUCCESS' : 'WAIT', data: { signatures: daXacNhan ? [{ signature_value: 'SIG64' }] : [] } });
  if (duong.endsWith('/signExternal')) return tl({ signResps: [{ signedData: Buffer.from('%PDF-da-ky').toString('base64') }] });
  throw new Error('gọi lạ ' + duong);
};

const r = await guiKy('doc-1', Buffer.from('%PDF-goc'), '080206000000', 'HD-1.pdf', f);
assert.equal(r.giao_dich, 'GD1');
assert.deepEqual(goi.map((g) => g.duong.split('/').pop()), ['get_certificate', 'calculateHash', 'sign']);
assert.equal(goi[1].than.sign_files[0].pdfContent, Buffer.from('%PDF-goc').toString('base64'));
assert.equal(goi[2].than.sign_files[0].data_to_be_signed, 'abcd');
assert.equal(goi[2].than.serial_number, 'SER1');

assert.equal((await kiemKy('doc-1', 'GD1', f)).trang_thai, 'cho_xac_nhan');
await assert.rejects(kiemKy('doc-khac', 'GD1', f));
daXacNhan = true;
const k = await kiemKy('doc-1', 'GD1', f);
assert.equal(k.trang_thai, 'da_ky'); assert.equal(k.pdf!.toString(), '%PDF-da-ky');
assert.deepEqual(goi.at(-1)!.than.signatures, [{ fileID: 'F1', signature: 'SIG64' }]);
const n = goi.length; await kiemKy('doc-1', 'GD1', f); assert.equal(goi.length, n, 'đã ký thì không gọi VNPT lại');
console.log('✔ SmartCA: gửi ký, chờ, ghép chữ ký, gắn đúng tài liệu');
