-- 020: Vựa nông sản Ba Cường (TC-M04, người mua thử chính của bản demo, số 0938000610) chưa có mã số thuế
-- nên không gửi được phiếu tìm nguồn (taoNhuCau bắt buộc mã số thuế). Bổ sung mã thử, cùng dải với các tổ chức mua khác.
UPDATE core.organizations SET tax_code = '0319990004'
 WHERE id = '99177a1f-dc84-588e-95bd-199401da0ed3' AND tax_code IS NULL;
