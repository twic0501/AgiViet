// Bản trình bày của snapshot hệ thống. Không tạo chữ ký hoặc metadata nghiệp vụ thay DB.
import {createHash} from 'node:crypto';
import {readdirSync,mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {THU_MUC_BACKEND} from '../cau-hinh.ts';
const dir=join(THU_MUC_BACKEND,'.du-lieu','ban-trinh-bay');
export function luuBanTrinhBay(orderId:string,doc:any):string{
 const hex=createHash('sha256').update(orderId+'|'+doc.code+'|'+doc.fileSha256).digest('hex').slice(0,32);
 const id=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
 mkdirSync(dir,{recursive:true});writeFileSync(join(dir,id+'.json'),JSON.stringify({id,...doc.payload,order_id:orderId,owner_org_id:null,doc_type:'settlement_statement',content_sha256:doc.contentSha256,file_sha256:doc.fileSha256,status:'draft',signatures:[],presentation_only:true}));return id;
}
export function docBanTrinhBay(id:string):any|null{
 if(!/^[a-f0-9-]{36}$/.test(id))return null;const path=join(dir,id+'.json');return existsSync(path)?JSON.parse(readFileSync(path,'utf8')):null;
}
export function danhSachBanTrinhBay(orderId:string):any[]{
 if(!existsSync(dir))return [];
 return readdirSync(dir).filter(f=>/^[a-f0-9-]{36}\.json$/.test(f)).map(f=>docBanTrinhBay(f.slice(0,-5))).filter(x=>x?.order_id===orderId);
}
