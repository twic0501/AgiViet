import { escapeHtml as e } from './format.js';

// Backend hiện trả tên trường trong câu lỗi; ưu tiên đường dẫn nếu sau này có.
export function demandIssue(error) {
  if (error.status !== 422 || error.code !== 'DU_LIEU_KHONG_HOP_LE') return null;
  const detail = error.details || {};
  const path = String(detail.field || detail.path || error.message || '');
  if (/min_source_qty_g/.test(path)) return {
    name: 'min', message: /không lớn hơn|<=/.test(path)
      ? 'Mỗi nguồn ít nhất không được lớn hơn lượng cần. Giảm lượng mỗi nguồn hoặc tăng lượng cần.'
      : 'Nhập lượng tối thiểu mỗi nguồn lớn hơn 0, tối đa bằng lượng cần (kg).',
  };
  if (/max_price_vnd/.test(path)) return {name: 'max', message: 'Nhập giá tối đa lớn hơn 0, bằng số nguyên đồng/kg.'};
  if (/qty_g/.test(path)) return {name: 'qty', message: 'Nhập lượng cần lớn hơn 0 (kg), tối đa 3 chữ số sau dấu phẩy.'};
  if (/grade_code/.test(path)) return {name: 'grade', message: 'Chọn loại hàng cho nhu cầu này.'};
  if (/needed_to|needed_from|Ngày cần/.test(path)) return {name: 'to', message: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.'};
  return null;
}

export function clearFormErrors(form) {
  form?.querySelectorAll('[data-field-error], [data-form-error]').forEach(el => el.remove());
  form?.querySelectorAll('[aria-invalid=true]').forEach(el => {
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
  });
}

export function showDemandError(form, error) {
  if (form?.dataset.form !== 'demand') return false;
  const issue = demandIssue(error), control = issue && form.elements.namedItem(issue.name);
  const input=control?.nodeType===1 ? control : control?.[0];
  if (!input) return false;
  const id = 'demand-error-' + issue.name;
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-describedby', id);
  (input.type==='radio' ? input.closest('fieldset') : input).insertAdjacentHTML('afterend', `<small class="field-error" data-field-error id="${id}" role="alert">${e(issue.message)}</small>`);
  form.insertAdjacentHTML('beforeend', `<div class="notice" data-form-error>${e(error.fix || 'Sửa ô được đánh dấu rồi gửi lại. Nội dung đã nhập được giữ nguyên.')}${error.requestId ? `<p class="support-code">Mã hỗ trợ: ${e(error.requestId)}</p>` : ''}<button type="button" class="secondary" data-action="support">Cần hỗ trợ</button></div>`);
  input.focus();
  input.scrollIntoView({block: 'center', behavior: 'instant'});
  return true;
}
