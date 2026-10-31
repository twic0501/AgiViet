// Lưu tệp (ảnh bằng chứng, PDF) theo mã băm và ghi metadata core.documents. Tệp lưu TRƯỚC khi chèn metadata
// (docs/database/06 mục ký); tệp mồ côi khi giao dịch rollback được dọn bằng job riêng (chưa làm).
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { GiaoDich } from '../db/co-so-du-lieu.ts';
import { loi } from '../loi.ts';

let thuMuc = '';
export function datThuMucTaiLieu(d: string) { thuMuc = d; mkdirSync(d, { recursive: true }); }

export function luuTep(bytes: Uint8Array): { sha256: string; key: string } {
  const sha = createHash('sha256').update(bytes).digest('hex');
  const key = `${sha.slice(0, 2)}/${sha}`;
  const p = join(thuMuc, key);
  if (!existsSync(p)) { mkdirSync(join(thuMuc, sha.slice(0, 2)), { recursive: true }); writeFileSync(p, bytes); }
  return { sha256: sha, key };
}

export function docTep(key: string): Buffer {
  if (!/^[0-9a-f]{2}\/[0-9a-f]{64}$/.test(key)) throw loi('KHONG_TIM_THAY');
  const p = join(thuMuc, key);
  if (!existsSync(p)) throw loi('KHONG_TIM_THAY', 'Tệp không còn trên kho lưu.');
  return readFileSync(p);
}

const MIME_CHO_PHEP = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const TOI_DA_BYTES = 8 * 1024 * 1024;

export interface ThongTinAnh {
  mime: string; data_base64: string; entity: 'organization' | 'lot' | 'order' | 'delivery' | 'acceptance' | 'payment' | 'dispute' | 'production_site';
  entity_id: string; captured_in_app: boolean; lat?: number; lng?: number; captured_at?: string;
}

// Đầu tệp phải khớp loại khai báo (không tin mime client gửi)
function dungLoai(mime: string, b: Buffer): boolean {
  if (mime === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === 'image/png') return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === 'image/webp') return b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP';
  if (mime === 'application/pdf') return b.subarray(0, 5).toString('latin1') === '%PDF-';
  return false;
}

/** Ảnh/chứng từ do người dùng gửi: nhãn nguồn self_declared, chỉ là đầu mối (không phải bằng chứng tiền). */
export async function luuBangChung(t:GiaoDich,userId:string,orgId:string,a:ThongTinAnh,orderId:string|null,laNguoiGiup=false){
 if(!MIME_CHO_PHEP.has(a.mime))throw loi('DU_LIEU_KHONG_HOP_LE');const bytes=Buffer.from(a.data_base64??'','base64');if(!bytes.length||bytes.length>TOI_DA_BYTES)throw loi('DU_LIEU_KHONG_HOP_LE');
 if(!dungLoai(a.mime,bytes))throw loi('DU_LIEU_KHONG_HOP_LE','Nội dung tệp không đúng loại ảnh/PDF đã khai.');
 // "Chụp trong app" do server quyết, không tin cờ client (Codex rà Đăng bài #6):
 // PDF không phải ảnh chụp; ảnh lô trùng mã băm với tệp đã có trên hệ thống là ảnh cũ dùng lại.
 let chup=!!a.captured_in_app&&a.mime.startsWith('image/'),lyDo:string|null=a.captured_in_app&&!chup?'PDF không tính là ảnh chụp hàng':null;
 if(chup&&a.entity==='lot'){const sha=createHash('sha256').update(bytes).digest('hex');
  if(await t.gtri<number>(`SELECT 1 FROM core.documents WHERE file_sha256=decode($1,'hex') LIMIT 1`,[sha])){chup=false;lyDo='Ảnh này đã có trên hệ thống, không phải ảnh vừa chụp';}}
 a={...a,captured_in_app:chup};
 const {sha256,key}=luuTep(bytes);const code=`BC-${randomBytes(6).toString('hex').toUpperCase()}`;
 const payload={code,series_key:code,version_no:1,content_sha256:'\\x'+sha256,file_sha256:'\\x'+sha256,storage_key:key,mime_type:a.mime,size_bytes:bytes.length,generator_version:'backend-v2',is_test_data:true};
 const ctx=await t.mot<any>(`SELECT current_setting('app.org_id',true) org,current_setting('app.actor_kind',true) side`);
 let side=ctx.side;if(laNguoiGiup)side='helper';else if(side==='system'){if(a.entity==='organization'&&orgId!==ctx.org)side='ops';else if(orderId){const buyer=await t.gtri<string>(`SELECT buyer_org_id FROM core.orders WHERE id=$1`,[orderId]);side=buyer===ctx.org?'buyer':'seller';}else side='seller';}if(!['ops','seller','buyer','helper'].includes(side))throw loi('KHONG_CO_QUYEN');
 const {damBaoDangNhap}=await import('../db/dang-nhap-rieng.ts');const {loginCmd}=await import('../db/command.ts');const login=await damBaoDangNhap(t,userId,ctx.org,side);
 const id=a.entity==='production_site'?await loginCmd<string>(t,login,'attach_cultivation_photo',[a.entity_id,payload]):orderId?await loginCmd<string>(t,login,'attach_evidence',[orderId,payload]):await loginCmd<string>(t,login,'attach_entity_evidence',[a.entity,a.entity_id,payload,!!a.captured_in_app]);return {id,code,sha256,captured_in_app:chup,ly_do:lyDo};
}

export const sha256Hex = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');
