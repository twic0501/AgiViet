import test from 'node:test';
import assert from 'node:assert/strict';
import {bankName,accountName,paymentQr,virtualMoneyNotice} from '../shared/virtual-money.js';
const trial={health:{moi_truong:'thu'}}, production={health:{moi_truong:'production'}};
test('QR thử không giữ payload VietQR ngân hàng, số tài khoản hay BIN thật',()=>{
  const real='00020101021238570010A0000007270127000697043601130123456789012';
  const result=paymentQr(trial,'AGV HD3003 COC',real);
  assert.match(result,/^AGIVIET-TEST-ONLY/);assert.match(result,/KHONG CHUYEN TIEN THAT/);
  assert.ok(!result.includes('970436'));assert.ok(!result.includes('0123456789012'));
  assert.equal(bankName(trial,'Agribank'),'Ngân hàng ảo AgiViet');
  assert.equal(accountName(trial,'****2186'),'ẢO · ****2186');
});
test('Nhãn ảo chỉ áp dụng ở môi trường thử đã xác nhận',()=>{
  for(const c of [production,{health:null}]) {
    assert.equal(bankName(c,'Bank'),'Bank');assert.equal(accountName(c,'123'),'123');
    assert.equal(paymentQr(c,'REF','REAL-QR'),'REAL-QR');assert.equal(virtualMoneyNotice(c),'');
  }
  assert.match(virtualMoneyNotice(trial),/Tiền ảo để xem quy trình, không chuyển tiền thật/);
});
