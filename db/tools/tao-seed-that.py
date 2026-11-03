#!/usr/bin/env python3
"""Sinh db/seed-that/000_danh_muc.sql cho HỆ THỐNG THẬT (không dữ liệu mẫu) từ db/seed-cho/000_du_lieu_cho.sql.
Giữ: danh mục (tỉnh, mặt hàng, hồ sơ, loại, lý do không đạt, chính sách, giá ngoài) + tổ chức AgiViet và nhân viên vận hành.
Bỏ: mọi người bán/người mua/lô/đơn/nhu cầu/khung/ngân hàng/xe mẫu. Chạy lại sau mỗi lần seed-cho đổi."""
import re, pathlib
GOC = pathlib.Path(__file__).resolve().parents[1]
nguon = (GOC / 'seed-cho' / '000_du_lieu_cho.sql').read_text().split('\n')
DANH_MUC = ('INSERT INTO ref.provinces', 'INSERT INTO core.products', 'INSERT INTO core.product_profiles', 'INSERT INTO core.product_grades',
            'INSERT INTO core.product_reject_reasons', 'UPDATE core.products', 'ALTER TABLE core.policy_versions', 'INSERT INTO core.policy_versions',
            'INSERT INTO mkt.external_prices', 'INSERT INTO ops.staff_assignments', 'REFRESH MATERIALIZED VIEW', 'PERFORM set_config',
            'ALTER TABLE core.membership_role_grants')
# Gom câu lệnh: dòng bắt đầu bằng từ khóa mở câu mới, dòng khác nối vào câu trước.
MO = re.compile(r'^(INSERT|UPDATE|ALTER|PERFORM|REFRESH|IF |ELSE|END|RETURN|SELECT|DO |DECLARE|BEGIN|--| IF| RETURN|DELETE)')
cau = []
for d in nguon:
    if MO.match(d) or not cau: cau.append([d])
    else: cau[-1].append(d)
txt = lambda c: '\n'.join(c)
staff = {m.group(1) for c in cau if c[0].startswith('INSERT INTO ops.staff_assignments') for m in [re.search(r"VALUES\('([0-9a-f-]{36})'", c[0])]}
agv = next(re.search(r"VALUES\('([0-9a-f-]{36})','AGV'", c[0]).group(1) for c in cau if c[0].startswith('INSERT INTO core.organizations') and "'AGV'" in c[0])
mem = {re.search(r"VALUES\('([0-9a-f-]{36})'", c[0]).group(1) for c in cau if c[0].startswith('INSERT INTO core.memberships') and f"'{agv}'" in c[0]}
def giu(c):
    s = c[0]
    if s.startswith(DANH_MUC): return True
    if s.startswith('INSERT INTO core.organizations'): return f"'{agv}'" in s
    if s.startswith(('INSERT INTO core.users', 'INSERT INTO pii.user_contacts')): return any(f"'{u}'" in s for u in staff)
    if s.startswith('INSERT INTO core.memberships'): return f"'{agv}'" in s
    if s.startswith('INSERT INTO core.membership_roles'): return any(f"'{m}'" in s for m in mem)
    if s.startswith('INSERT INTO ops.seed_sources'): return False
    # Khung DO, chốt chạy một lần, set_config đầu/cuối, ghi chú
    return s.startswith(('SELECT set_config', 'DO $seed$', 'IF EXISTS', ' IF NOT EXISTS', ' RETURN', 'END $seed$', '--'))
ra = [txt(c) for c in cau if giu(c)]
ra = [x.replace("du-lieu-cho.json", "danh-muc-that") for x in ra]
# Chốt chạy một lần: ghi dấu nguồn ngay đầu khối (không mang payload chợ mẫu).
i = next(k for k, x in enumerate(ra) if x.startswith('IF EXISTS'))
ra[i] = "IF EXISTS(SELECT 1 FROM ops.seed_sources WHERE source_key='danh-muc-that') THEN RETURN; END IF;\nINSERT INTO ops.seed_sources(source_key,sha256,payload) VALUES('danh-muc-that',digest('danh-muc-that','sha256'),'{}');"
ra = [x for x in ra if not x.startswith((' IF NOT EXISTS', ' RETURN'))]
dau = "-- Tự sinh bằng db/tools/tao-seed-that.py từ seed-cho. Hệ thống thật: chỉ danh mục + nhân viên AgiViet, KHÔNG có người bán/người mua/lô/đơn mẫu. Không sửa tay.\n"
(GOC / 'seed-that').mkdir(exist_ok=True)
(GOC / 'seed-that' / '000_danh_muc.sql').write_text(dau + '\n'.join(ra) + '\n')
dem = lambda p: sum(1 for x in ra if x.startswith(p))
print('nhân viên', len(staff), '· sản phẩm', dem('INSERT INTO core.products'), '· loại', dem('INSERT INTO core.product_grades'), '· tổ chức', dem('INSERT INTO core.organizations'),
      '· người dùng', dem('INSERT INTO core.users'), '· lô', dem('INSERT INTO core.lots'), '· nhu cầu', dem('INSERT INTO core.demands'))
assert dem('INSERT INTO core.lots') == 0 and dem('INSERT INTO core.demands') == 0 and dem('INSERT INTO core.organizations') == 1
