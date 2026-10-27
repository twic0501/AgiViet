import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCase,casePath,testAccess} from '../quan-tri/case-engine.js';
test('Chưa gọi ngân hàng thành công thì không chứng nhận case tiền đã về',async()=>{
  const record={template:'completed',orderId:'order'};
  const api={get:async path=>path.endsWith('/money')?{lenh_ngan_hang:[{status:'created'}]}:{status:'completed'}};
  await assert.rejects(verifyCase(record,api),/chưa được ngân hàng xác nhận/);
});
test('Đơn active chưa đủ chứng minh đang nghiệm thu hoặc tranh chấp mở',async()=>{
  await assert.rejects(verifyCase({template:'checking',orderId:'o',deliveryId:'d'},{get:async p=>({status:p.includes('deliveries')?'ready':'active'})}),/chưa ở trạng thái checking/);
  await assert.rejects(verifyCase({template:'dispute',orderId:'o',disputeId:'d'},{get:async p=>({status:p.includes('disputes')?'resolved':'active'})}),/chưa mở/);
});
test('Đường mở đúng màn của lời chào và mẫu tiền',()=>{
  assert.equal(casePath({template:'offer',offerId:'x'}),'offers/x');
  assert.equal(casePath({template:'completed',orderId:'y'}),'order/y/money');
});
test('Capability công khai bị từ chối trước khi thăm dò môi trường hoặc API thử',async()=>{
  const calls=[];
  await assert.rejects(testAccess({get:async p=>{calls.push(p);return {test_tools:false}}}),/cổng operator/);
  assert.deepEqual(calls,['/frontend-capabilities.json']);
});
