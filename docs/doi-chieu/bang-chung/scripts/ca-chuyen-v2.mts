// Focused ports of legacy expectations. All resets are in-memory, never the pilot.
import {writeFileSync} from 'node:fs';
import {dungApp} from '../../../../backend/src/app.ts';
import {docCauHinh} from '../../../../backend/src/cau-hinh.ts';
import {May,TinhHuong,SDT} from '../../../../backend/test/khung.ts';
import {ANH_PNG,dangNhapCacBen,chaoVaDongY,lapVaKy,chuyenCoc,traThangVaXacNhan,chuanBiGiao} from '../../../../backend/test/luong.ts';
const cfg=docCauHinh();cfg.databaseUrl=null;cfg.thuMucDb=null;cfg.thuMucTaiLieu='/tmp/agv-audit-ca-chuyen';cfg.logLevel='silent';
const {app,ht}=await dungApp(cfg);const may=new May(app,ht);const rows:any[]=[];
async function run(id:string,fn:(t:TinhHuong)=>Promise<void>){await may.datLai();const t=new TinhHuong(id,id);let error;try{await fn(t)}catch(e:any){error=e.message}const result={id,pass:!error&&t.buoc.length>0&&t.buoc.every(x=>x.dat),error,checks:t.buoc};rows.push(result);console.log(JSON.stringify(result));}
await run('AD-B08',async t=>{
 let nam=await may.dangNhap(SDT.nam),buyer=await may.dangNhap(SDT.ha);
 const lot=await nam.ok('/v1/lots',{product_code:'XOAI_CAT_CHU',grade_code:'L1',qty_basis:'weighed',qty_g:1000000,harvest_on:'2026-11-02',spray_clear_on:'2026-11-01',available_from:'2026-11-02',ask_price_vnd:24000,floor_price_vnd:19000});
 await nam.ok('/v1/files',{mime:'image/png',data_base64:ANH_PNG,entity:'lot',entity_id:lot.id,captured_in_app:true});
 await nam.ok(`/v1/lots/${lot.id}/publish`,{});
 t.kiem('Buyer thấy trước 14 ngày',(await buyer.get('/v1/lots')).json.some((x:any)=>x.id===lot.id));
 await may.he('/v1/test/clock',{advance_minutes:14*24*60+1});nam=await may.dangNhap(SDT.nam);buyer=await may.dangNhap(SDT.ha);
 t.kiem('Buyer không thấy sau 14 ngày',(await buyer.get('/v1/lots')).json.every((x:any)=>x.id!==lot.id));
 await nam.ok(`/v1/lots/${lot.id}/confirm-available`,{});
 t.kiem('Buyer thấy lại sau xác nhận',(await buyer.get('/v1/lots')).json.some((x:any)=>x.id===lot.id));
});
await run('AD-B16-M09',async t=>{
 const b=await dangNhapCacBen(may);
 const over=await b.ha.post('/v1/offers',{direction:'buyer_bid',lot_id:b.lotId,qty_g:5000000,price_vnd:23000});
 t.bang('Chào quá lượng vẫn được gửi (khác điểm chặn mẫu)',over.status,200);
 if(over.status===200){const acceptOver=await b.nam.post(`/v1/offers/${over.json.id}/accept`,{});t.kiem('Không thể giữ5.000kg trên lô4.000',acceptOver.status>=400,acceptOver.json);await b.ha.ok(`/v1/offers/${over.json.id}/withdraw`,{});}
 const a=await b.ha.ok('/v1/offers',{direction:'buyer_bid',lot_id:b.lotId,qty_g:3000000,price_vnd:23000});
 const buyer2=await may.dangNhap(SDT.quan);
 const b2=await buyer2.ok('/v1/offers',{direction:'buyer_bid',lot_id:b.lotId,qty_g:3000000,price_vnd:23000});
 await b.nam.ok(`/v1/offers/${a.id}/accept`,{});
 const second=await b.nam.post(`/v1/offers/${b2.id}/accept`,{});
 t.kiem('Không đồng ý được lời chào thứ 2 vượt còn bán',second.status>=400,second.json);
 const qty=(await b.nam.get(`/v1/lots/${b.lotId}/qty`)).json;
 t.bang('Chỉ giữ 3.000 kg',qty.held,'3000000');t.bang('Còn 1.000 kg',qty.available,'1000000');
});
await run('AD-B17',async t=>{
 const b=await dangNhapCacBen(may);const o=await b.ha.ok('/v1/offers',{direction:'buyer_bid',lot_id:b.lotId,qty_g:3000000,price_vnd:23000});
 const first=await b.nam.post(`/v1/offers/${o.id}/accept`,{},{key:'audit-accept-same-key'});const replay=await b.nam.post(`/v1/offers/${o.id}/accept`,{},{key:'audit-accept-same-key'});const again=await b.nam.post(`/v1/offers/${o.id}/accept`,{});
 t.bang('Lần đầu thành công',first.status,200);t.bang('Cùng khóa trả200',replay.status,200);t.bang('Có replayed',replay.json.replayed,true);t.kiem('Khóa mới bị chặn',again.status>=400,again.json);t.bang('Giữ đúng một lần',(await b.nam.get(`/v1/lots/${b.lotId}/qty`)).json.held,'3000000');
});
await run('AD-B18',async t=>{
 const b=await dangNhapCacBen(may);await chaoVaDongY(b,null);
 const order=await b.ha.ok('/v1/orders',{offer_id:b.offerId,downgrade_price_vnd:15000,delivery_mode:'at_farm',transport_by:'buyer',delivery_from:'2026-11-04T06:00:00+07:00',delivery_to:'2026-11-04T12:00:00+07:00',payment_timing:'before_loading'});
 const challenge=await b.ha.otpKy(order.data.document_id);await b.ha.ok(`/v1/orders/${order.id}/sign`,{challenge_id:challenge,code:'123456'});
 const x=await b.nam.ok(`/v1/orders/${order.id}/decline`,{reason:'Không bảo đảm ngày giao trong thử đối chiếu'});
 const after=(await b.nam.get(`/v1/orders/${order.id}`)).json;const qty=(await b.nam.get(`/v1/lots/${b.lotId}/qty`)).json;
 t.bang('Từ chối đóng đơn',after.status,'closed');t.bang('Hold trả về0',qty.held,'0');t.bang('Lô còn4.000kg',qty.available,'4000000');t.kiem('Lý do từ chối có lưu',JSON.stringify(after).includes('Không bảo đảm ngày giao'),{response:x,order:after});
});
await run('AD-B44-M30',async t=>{
 const b=await dangNhapCacBen(may);await chaoVaDongY(b,null,25000,1000);await lapVaKy(b,null);await chuyenCoc(b);
 const pay=(await b.lan.get(`/v1/orders/${b.orderId}/payments`)).json.find((p:any)=>p.kind==='goods_before_loading');await traThangVaXacNhan(b,Number(pay.amount_due_vnd),'AUDIT-B44');await chuanBiGiao(b);
 await may.he('/v1/test/clock',{set:'2026-11-04T06:30:00+07:00'});const qr=await b.phuc.ok(`/v1/deliveries/${b.deliveryId}/receipt-qr`,{});await b.nam.ok(`/v1/deliveries/${b.deliveryId}/start-check`,{qr_token:qr.data.qr_token,plate_no:'66C-123.45'});
 const body:any={pin:'2468',weighed_g:1000000,seal_code:'AUDIT-B44',lines:[{kind:'accepted',qty_g:850000},{kind:'downgraded',qty_g:50000,reason_code:'TRAY_VO'},{kind:'rejected',qty_g:100000,reason_code:'DAP'}]};
 const noPhoto=await b.phuc.post(`/v1/deliveries/${b.deliveryId}/acceptance`,body);t.bang('Trả10%khôngảnh bị chặn',noPhoto.json.errors?.[0]?.code,'THIEU_ANH_TRA_LAI');
 const photo=await b.phuc.ok('/v1/files',{mime:'image/png',data_base64:ANH_PNG,entity:'delivery',entity_id:b.deliveryId,captured_in_app:true});body.lines[2].evidence_document_id=photo.id;
 const yes=await b.phuc.post(`/v1/deliveries/${b.deliveryId}/acceptance`,body);t.kiem('Kèm ảnh được nhập',yes.status===200,yes.json);
 if(yes.status===200){const d=(await b.nam.get(`/v1/deliveries/${b.deliveryId}`)).json;const last=d.ket_qua.at(-1);t.bang('Giá trị nghiệm thu22triệu',last.lines.reduce((n:bigint,l:any)=>n+BigInt(l.value_vnd),0n).toString(),'22000000');
 await b.nam.ok(`/v1/deliveries/${b.deliveryId}/acceptance/agree`,{pin:'2468',expected_sha256:last.content_sha256});const d2=(await b.nam.get(`/v1/deliveries/${b.deliveryId}`)).json;t.kiem('Bên bán xác nhận: các dòng đã đóng',d2.ket_qua.at(-1).lines.every((l:any)=>l.status==='closed'),d2);writeFileSync(new URL('../du-lieu/nghiem-thu-sau-ky.json',import.meta.url),JSON.stringify(d2,null,2));}
});
writeFileSync(new URL('../du-lieu/ca-chuyen-v2.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),kind:'API adapter partial coverage; not browser E2E',rows},null,2));await app.close();await ht.db.dong();
