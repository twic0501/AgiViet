import test from 'node:test';import assert from 'node:assert/strict';
import {decision,profiles} from '../quan-tri/profiles.js';
import {Opponent} from '../quan-tri/opponent.js';
import {virtualMoneyNotice} from '../shared/virtual-money.js';
test('Seed giữ quyết định khi UUID/thời gian thay đổi; các seed phủ các lựa chọn',()=>{const choices=['accept','counter'];assert.equal(decision('vu-xoai','offer-2',choices),decision('vu-xoai','offer-2',choices));assert.deepEqual(new Set(Array.from({length:100},(_,i)=>decision('seed-'+i,'offer-2',choices))),new Set(choices));});
test('App bán giữ yêu cầu bỏ nhãn tiền và dải thử; app mua vẫn có nhãn',()=>{assert.equal(virtualMoneyNotice({app:'ban',health:{moi_truong:'thu'}}),'');assert.match(virtualMoneyNotice({app:'mua',health:{moi_truong:'thu'}}),/Tiền ảo/);});
test('Đối ứng chỉ trả lời khi tới lượt mình; không tự chấp thuận thay phía người thử',async()=>{const calls=[];const opponent=new Opponent({}, {offerId:'o',seed:'1'},'seller');opponent.who={api:{get:async()=>({status:'sent',toi_luot:'seller',rounds:[{from_side:'buyer'}]}),command:async(...args)=>calls.push(args)}};await opponent.tick();assert.deepEqual(calls,[]);});
test('Hồ sơ chưa nối đủ hai app không được đánh dấu có sẵn',()=>{assert.equal(profiles.find(p=>p.id==='urgent').unavailable,true);assert.equal(profiles.filter(p=>!p.unavailable).length,7);});
test('Hồ sơ cần kiểm định giữ quyền quyết định, không tự cân lại hoặc kết luận',async()=>{const calls=[],notes=[];const opponent=new Opponent({}, {orderId:'o',profile:'inspection'},'seller',n=>notes.push(n),()=>{});opponent.who={api:{get:async p=>{calls.push(p);return {id:'o',status:'active',hanh_dong:[]};},command:async()=>{throw new Error('Không được tự xử lý kiểm định');}}};await opponent.tick();assert.deepEqual(calls,['/v1/orders/o']);assert.match(notes[0],/không tự cân lại/);});
test('Kiểm định không ghi thành công khi HTTP ngoài 200 nhưng webhook bên trong lỗi',async()=>{
  const calls=[],record={profile:'arrival',orderId:'o',seed:'thu-0'},opponent=new Opponent({post:async()=>({http:409,body:{errors:[{code:'TRANG_THAI_KHONG_CHO_PHEP',message:'Chờ lệnh tạm'}]}})},record,'buyer',()=>{},()=>{});
  opponent.who={api:{get:async path=>path.endsWith('/money')?{lenh_ngan_hang:[]}:[{id:'d',status:'awaiting_inspection',inspections:[{id:'i',result:null}]}]}};
  opponent.bank=async()=>calls.push('doi-soat-tam');
  await assert.rejects(opponent.deliverInspectionResult('passed'),err=>err.status===409&&err.message==='Chờ lệnh tạm');
  assert.deepEqual(calls,['doi-soat-tam']);assert.equal(record.opponentLog,undefined);
});
test('Không giao kết quả kiểm định khi quyết toán tạm còn lệnh chờ',async()=>{
  const opponent=new Opponent({post:async()=>{throw new Error('Không được giao webhook trước lệnh tạm');}},{profile:'arrival',orderId:'o'},'buyer',()=>{},()=>{});
  opponent.who={api:{get:async path=>path.endsWith('/money')?{lenh_ngan_hang:[{code:'NH01',status:'sent'}]}:[{id:'d',status:'awaiting_inspection',inspections:[{id:'i',result:null}]}]}};opponent.bank=async()=>{};
  await assert.rejects(opponent.deliverInspectionResult('passed'),/Chưa xử lý xong lệnh quyết toán tạm/);
});
test('Ngân hàng đối soát thêm đợt cuối, không bỏ qua vì đã đối soát tạm',async()=>{
  let instructions=[{code:'NH01',status:'succeeded'}],reconciles=0;
  const api={post:async path=>path==='/v1/test/impersonate'?{token:'ao',user:{user_id:'finance'}}:{},get:async()=>[{phone:'0901000005',org_code:'AGV',staff_roles:'finance'}],fetcher:async path=>{if(path==='/v1/ops/reconcile')reconciles++;return new Response(JSON.stringify({data:{}}));}};
  const opponent=new Opponent(api,{orderId:'o'},'buyer',()=>{},()=>{});opponent.who={api:{get:async()=>({lenh_ngan_hang:instructions})}};
  await opponent.bank('o');await opponent.bank('o');assert.equal(reconciles,1);
  instructions=[...instructions,{code:'NH02',status:'succeeded'}];await opponent.bank('o');assert.equal(reconciles,2);
});
