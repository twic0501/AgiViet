import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../shared/api.js';
import { demandIssue } from '../shared/form-errors.js';

for (const [field, name] of [['qty_g','qty'], ['max_price_vnd','max'], ['min_source_qty_g','min'], ['grade_code','grade']]) {
  test(`422 nhu cầu gắn ${field} vào ô ${name}, không lộ mã trường`, () => {
    const error = new ApiError(422, {errors:[{code:'DU_LIEU_KHONG_HOP_LE',message:`Dòng 1: ${field} bắt buộc, là số nguyên dương.`}]});
    const issue = demandIssue(error);
    assert.equal(issue.name, name);
    assert.doesNotMatch(issue.message, /_g|_vnd|grade_code/);
  });
}
test('Lượng mỗi nguồn vượt lượng cần chỉ đánh dấu ô tối thiểu', () => {
  const issue = demandIssue(new ApiError(422, {errors:[{code:'DU_LIEU_KHONG_HOP_LE',message:'Dòng 1: min_source_qty_g không lớn hơn qty_g.'}]}));
  assert.equal(issue.name, 'min');
  assert.match(issue.message, /không được lớn hơn lượng cần/);
});
test('Không gán nhầm lỗi không biết hoặc lỗi máy chủ vào trường nhu cầu', () => {
  assert.equal(demandIssue(new ApiError(500, {errors:[{code:'LOI_HE_THONG',message:'qty_g'}]})), null);
  assert.equal(demandIssue(new ApiError(422, {errors:[{code:'DU_LIEU_KHONG_HOP_LE',message:'Thông tin khác chưa đúng.'}]})), null);
});
test('Giữ đường dẫn lỗi từ API để gắn đúng ô khi backend có details', () => {
  const error = new ApiError(422, {errors:[{code:'DU_LIEU_KHONG_HOP_LE',message:'Thông tin sai.',details:{path:'lines.0.max_price_vnd'}}],request_id:'req-field'});
  assert.equal(demandIssue(error).name, 'max');
  assert.equal(error.requestId, 'req-field');
});
test('501 chưa hỗ trợ hiện câu cho người dùng, không lộ chi tiết command DB', () => {
  const error = new ApiError(501, {errors:[{code:'CHUA_HO_TRO',message:'DB chưa có command đăng ký; owner bị chặn.'}]});
  assert.match(error.message, /chưa sẵn sàng/);
  assert.doesNotMatch(error.message, /DB|command|owner/);
});
