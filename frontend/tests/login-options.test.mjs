import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverTestTools, phoneSuggestions } from '../shared/login-options.js';
import { taskDue } from '../quan-tri/admin.js';

test('Cổng công khai không gọi test/accounts dù health là thử', async () => {
  const calls=[];
  const result=await discoverTestTools({get:async path=>{calls.push(path);return {test_tools:false};}}, {moi_truong:'thu'});
  assert.deepEqual(result,[]);
  assert.deepEqual(calls,['/frontend-capabilities.json']);
});
for(const status of [403,404,0]) test(`Công cụ thử lỗi ${status} không thoát vào màn chính`,async()=>{
  const calls=[];
  const result=await discoverTestTools({get:async path=>{calls.push(path);if(path==='/frontend-capabilities.json')return {test_tools:true};throw Object.assign(new Error('denied'),{status});}}, {moi_truong:'thu'});
  assert.deepEqual(result,[]);
  assert.equal(calls.length,2);
});
test('Chỉ hiện công cụ khi API trả danh sách hợp lệ',async()=>{
  const accounts=[{phone:'0918000421'}];
  assert.deepEqual(await discoverTestTools({get:async p=>p==='/frontend-capabilities.json'?{test_tools:true}:accounts},{moi_truong:'thu'}),accounts);
  assert.deepEqual(await discoverTestTools({get:async p=>p==='/frontend-capabilities.json'?{test_tools:true}:{}},{moi_truong:'thu'}),[]);
});
test('Môi trường thật không có gợi ý OTP và không thăm dò công cụ',async()=>{
  assert.equal(phoneSuggestions('ban',{moi_truong:'production'}),'');
  assert.deepEqual(await discoverTestTools({get:()=>assert.fail('Không được gọi')},{moi_truong:'production'}),[]);
});
test('Hạn SLA dùng giờ backend; việc xong không tính quá hạn',()=>{
  const task={status:'new',response_due_at:'2026-11-02T01:00:00Z',resolution_due_at:'2026-11-03T01:00:00Z'};
  assert.equal(taskDue(task,'2026-11-02T02:00:00Z'),true);
  assert.equal(taskDue({...task,status:'claimed'},'2026-11-02T02:00:00Z'),false);
  assert.equal(taskDue({...task,status:'done'},'2026-11-04T02:00:00Z'),false);
});
