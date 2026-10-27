#!/usr/bin/env python3
"""Sinh SQL thuần từ nguồn JSON; số học Decimal, UUID ổn định. Chạy từ mọi cwd."""
import json,hashlib,uuid
from decimal import Decimal
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
source=ROOT/'docs/nghiep-vu/du-lieu-ao.json'
raw=source.read_bytes(); x=json.loads(raw,parse_float=Decimal)
def ident(s): return str(uuid.uuid5(uuid.NAMESPACE_URL,'agiviet-v2:'+s))
def q(v):
 if v is None:return 'NULL'
 if isinstance(v,bool):return 'true' if v else 'false'
 if isinstance(v,(int,Decimal)):return str(v)
 if isinstance(v,(dict,list)):return "'"+json.dumps(v,ensure_ascii=False,default=str).replace("'","''")+"'::jsonb"
 return "'"+str(v).replace("'","''")+"'"
def arr(v):return 'ARRAY['+','.join(q(z) for z in v)+']::text[]'
s=[]
def sql(t):s.append(t+';')
def ins(table,**kw):sql('INSERT INTO '+table+'('+','.join(kw)+') VALUES('+','.join(q(v) for v in kw.values())+')')
def uid(k):return ident(k)
T=x['meta']['dong_ho_nen']; digest=hashlib.sha256(raw).hexdigest()
sql('ALTER TABLE core.membership_role_grants DISABLE TRIGGER a_privilege')
sql('ALTER TABLE core.membership_role_grants DISABLE TRIGGER z_notify_grant')
sql("PERFORM set_config('app.allow_any_initial','on',true)")
sql("PERFORM set_config('app.actor_kind','system',true)")
sql("PERFORM set_config('app.test_time',"+q(T)+",true)")
# Lưu nguyên JSON bằng bản text gốc, giữ cả tỷ lệ số chứ không chuyển thành chuỗi.
sql('INSERT INTO ops.seed_sources(source_key,sha256,payload) VALUES(\'du-lieu-ao.json\',decode('+q(digest)+",'hex'),"+q(raw.decode())+'::jsonb)')
for code,name in [('DT','Đồng Tháp (mã thử)'),('CT','Cần Thơ (mã thử)'),('TN','Tây Ninh (mã thử)'),('VL','Vĩnh Long (mã thử)'),('AG','An Giang (mã thử)'),('HCM','TP.HCM (mã thử)')]: ins('ref.provinces',code=code,name_vi=name)
orgs=x['to_chuc_ban']+x['to_chuc_mua']+[dict(ma=z['ma'],ten=z['ten'],loai='doi_tac') for z in x['doi_tac'] if z['ma']!='ĐG-01']+[dict(ma='AGV',ten='AgiViet',loai='platform')]
kind={'ho':'household','trang_trai':'household','htx':'cooperative','to_hop_tac':'coop_group','doi_tac':'service_partner','platform':'platform'}
segment={'xuat_khau':'export','che_bien':'processor','nha_hang':'horeca','dau_moi':'wholesaler'}
plan={'mien_phi':'free','thu_mua':'procurement','doanh_nghiep':'enterprise','bep':'kitchen'}
for o in orgs:
 code=o['ma']; sell=code.startswith('TC-B') or code=='TC-M07'; buy=code.startswith('TC-M'); region='DT'
 if code in ['TC-B09','TC-B10','TC-M03']:region='CT'
 if code=='TC-B07':region='TN'
 if code=='TC-B08':region='VL'
 if code=='TC-B14':region='AG'
 if code=='TC-M01':region='HCM'
 orgkind=kind.get(o.get('loai'), 'trader' if code in ['TC-M07','TC-M08'] else 'enterprise')
 ins('core.organizations',id=uid(code),code=code,kind=orgkind,display_name=o['ten'],tax_code=o.get('mst'),can_sell=sell,can_buy=buy,is_platform=code=='AGV',province_code=region,verification_level=2,status='active',created_at=T)
 for seg in o.get('phan_khuc',[]):ins('core.org_buyer_segments',org_id=uid(code),segment_code=segment[seg],source='declared')
 if buy:sql('INSERT INTO core.subscriptions(org_id,plan_code,active_during) VALUES('+q(uid(code))+','+q(plan[o['goi']])+",tstzrange('2026-10-01','2027-01-01','[)'))")
roles={'chu':'owner','chu_nhiem':'coop_board','to_truong':'owner','ke_toan_htx':'accountant','nhan_vien_diem_gom':'collection_staff','mua_hang':'purchaser','ke_toan':'accountant','kho':'warehouse','quan_ly':'owner','nguoi_nhan':'site_receiver','quan_ly_kho':'owner'}
staff={'VH-DP':'dispatcher','VH-HT':'field','VH-DS-lap':'finance','VH-DS-duyet':'finance','VH-RR':'risk','VH-DM':'catalog','VH-QL':'supervisor','kiem_dinh_vien':'inspector'}
for u in x['nguoi_dung']:
 code=u['ma'];org=u['to_chuc'];role=u['vai'];ins('core.users',id=uid(code),display_name=u['ho_ten'],is_staff=role.startswith('VH-'),created_at=T)
 # TEST: bản mã có tiền tố rõ, không giả là AES thật; chỉ hash số điện thoại giả.
 phone=u['dien_thoai'];sql('INSERT INTO pii.user_contacts(user_id,phone_enc,phone_hash,phone_masked,key_id,phone_verified_at) VALUES('+q(uid(code))+",convert_to("+q('TEST-PLAINTEXT:'+phone)+",'UTF8'),digest("+q(phone)+",'sha256'),"+q(phone[:4]+'***'+phone[-3:])+",'TEST-NOT-ENCRYPTED',"+q(T)+')')
 if role in staff:ins('ops.staff_assignments',user_id=uid(code),role_code=staff[role])
 if role=='nguoi_giup':continue
 limit=next((o.get('han_muc_ky',{}).get(code) for o in orgs if o['ma']==org),None)
 ins('core.memberships',id=uid('member:'+code),org_id=uid(org),user_id=uid(code),approval_limit_vnd=limit,created_at=T)
 if role in roles:ins('core.membership_roles',membership_id=uid('member:'+code),role_code=roles[role])
 if role=='chu_nhiem':ins('core.membership_roles',membership_id=uid('member:'+code),role_code='owner')
sql("UPDATE core.membership_role_grants SET effective_at='2026-10-01'")
sql('ALTER TABLE core.membership_role_grants ENABLE TRIGGER a_privilege')
sql('ALTER TABLE core.membership_role_grants ENABLE TRIGGER z_notify_grant')
sql('INSERT INTO core.delegations(org_id,principal_user_id,helper_user_id,actions,valid_during) VALUES('+q(uid('TC-B01'))+','+q(uid('ND-001'))+','+q(uid('ND-002'))+",ARRAY['view','lot.draft','message.send','delivery.record'],tstzrange('2026-10-01','2027-01-01','[)'))")
sql('ALTER TABLE pii.bank_accounts DISABLE TRIGGER a_activation_clock')
for o in x['to_chuc_ban']:
 code=o['ma']; bank=o.get('tai_khoan_nhan_tien');owner=next(u['ma'] for u in x['nguoi_dung'] if u['to_chuc']==code and u['vai'] in ['chu','chu_nhiem','to_truong'])
 if bank and o.get('loai')!='to_hop_tac':
  sql('INSERT INTO pii.bank_accounts(id,org_id,bank_code,account_number_enc,account_number_hash,account_masked,holder_name,name_match,requested_by,verify_factors,key_id,status,created_at,activated_at) VALUES('+','.join([q(uid('bank:'+code)),q(uid(code)),q(bank.get('ngan_hang','TEST')), "convert_to("+q('TEST:'+bank['so'])+",'UTF8')", "digest("+q(bank['so'])+",'sha256')",q('****'+bank['so'][-4:]),q(bank.get('chu',o['ten'])), 'true',q(uid(owner)),"ARRAY['otp','in_person']","'TEST-NOT-ENCRYPTED'","'active'","'2026-10-01'","'2026-10-02'"])+')')
 # Địa bàn chưa có mã xã/toạ độ chính thức: giữ nguyên tên nguồn, không tạo tọa độ giả.
 ins('core.production_sites',id=uid('site:'+code),org_id=uid(code),kind='pond' if code in ['TC-B09','TC-B10','TC-B14'] else 'field' if code=='TC-B11' else 'orchard',name=o.get('dia_ban',o['ten']))
 for i,c in enumerate(o.get('giay_to',[])):
  kinds={'ma_vung_trong':'growing_area_code','vietgap':'vietgap','nhat_ky_ao':'pond_diary'}
  if c['loai'] not in kinds:continue
  for market in c.get('thi_truong',[None]):
   sql('INSERT INTO core.certifications(org_id,site_id,kind,number,market,valid_during,verified_by,verified_at) VALUES('+','.join([q(uid(code)),q(uid('site:'+code)),q(kinds[c['loai']]),q(c.get('ma')),q(market),"daterange('2026-01-01',"+q(c.get('hieu_luc_den','2027-01-01'))+"::date+1,'[)')",q(uid('ND-307')) if c.get('trang_thai')=='da_xac_minh' else 'NULL',q(T) if c.get('trang_thai')=='da_xac_minh' else 'NULL'])+')')
sql('ALTER TABLE pii.bank_accounts ENABLE TRIGGER a_activation_clock')
# Danh mục từ 01; JSON không có hồ sơ ngành hàng.
products=[('XOAI_CAT_CHU','Xoài cát Chu','fresh_fruit',1,'grade',500,500,7,['L1','L2','L3']),('CHANH_KHONG_HAT','Chanh không hạt','fresh_fruit',1,'grade',500,500,21,['L1','L2','DAT']),('TOM_THE','Tôm thẻ chân trắng','aquaculture',1,'size_table',500,500,1,['48-52','53-60','61-70']),('LUA_TUOI','Lúa tươi','grain',1,'moisture',1000,500,1,['OM18-am25']),('SAU_RIENG','Sầu riêng','fresh_fruit',2,'grade',500,300,5,['A','B','C']),('BUOI_DA_XANH','Bưởi da xanh','fresh_fruit',2,'grade',500,500,28,['L1','L2','DAT']),('THANH_LONG','Thanh long','fresh_fruit',3,'grade',500,500,7,['L1','L2','DAT','chua_tach']),('CA_TRA','Cá tra nguyên liệu','aquaculture',3,'size_table',1000,500,1,['0.8-1.2','ngoai_co'])]
criteria={'XOAI_CAT_CHU':['300–450 g/trái, không vết đen quá 5%, không dập, già 80–85%','220–299 g hoặc vết vỏ 5–20%','Dưới 220 g, trầy nặng, chín ép'], 'SAU_RIENG':['2–5 kg/trái, ít nhất 4 múi đầy, không sâu nứt','1,5–2 kg hoặc thiếu một múi','Dưới 1,5 kg, méo, thiếu múi']}
for p,name,g,tier,mode,tol,reject,life,grades in products:
 ins('core.products',id=uid(p),code=p,name_vi=name,group_code=g,open_tier=tier)
 ins('core.product_profiles',product_id=uid(p),profile_version=1,quality_mode=mode,qty_tolerance_bps=tol,reject_allowance_bps=reject,shelf_life_days=life,config={'source':'docs/nghiep-vu/01-mat-hang.md','test_parameters':True})
 for i,grade in enumerate(grades):ins('core.product_grades',product_id=uid(p),profile_version=1,grade_code=grade,label_vi=grade,rank=i+1,is_substandard=grade in ['L2','L3','DAT','C','ngoai_co'],criteria=criteria.get(p,[])[i] if i<len(criteria.get(p,[])) else 'Thông số thử theo 01-mat-hang.md; khoảng '+grade)
 for reason,label in [('DAP','Dập'),('THOI','Thối'),('SAU_DUC','Sâu đục'),('TRAY_VO','Trầy vỏ'),('SAI_GIONG','Sai giống'),('AN_TOAN','Không đạt an toàn')]:ins('core.product_reject_reasons',product_id=uid(p),profile_version=1,reason_code=reason,label_vi=label,is_safety=reason=='AN_TOAN')
 sql('UPDATE core.products SET current_profile_version=1 WHERE id='+q(uid(p)))
sql('ALTER TABLE core.policy_versions DISABLE TRIGGER a_policy_approval')
# Snapshot chính sách lịch sử từ nguồn, không bịa quyết định duyệt quá khứ.
ins('core.policy_versions',id=1,effective_from='2026-10-01T00:00:00+07:00',deadlines=x['chinh_sach']['han_gio'],note='Tham số thử từ du-lieu-ao.json; hạn dạng số giờ/ngày theo tên khóa.')
sql('ALTER TABLE core.policy_versions ENABLE TRIGGER a_policy_approval')
for o in orgs:
 if o['ma'].startswith('TC-M'):
  ins('core.facilities',id=uid('facility:'+o['ma']),org_id=uid(o['ma']),kind='restaurant' if o['ma'] in ['TC-M05','TC-M06'] else 'buyer_warehouse',name=o.get('dia_chi_nhan',o['ten']))
ins('core.facilities',id=uid('ĐG-01'),org_id=uid('TC-B03'),kind='collection_point',name='Điểm gom HTX Mỹ Xương',collection_fee_vnd_per_kg=300)
ins('core.facilities',id=uid('facility:DT-KHO'),org_id=uid('DT-KHO'),kind='cold_storage',name='Kho lạnh Tân Phú Lạnh',cold_min_dc=20,cold_max_dc=130)
for l in x['lo']:
 ins('core.lots',id=uid(l['ma']),code=l['ma'],seller_org_id=uid(l['ban']),product_id=uid(l['mat_hang']),profile_version=1,grade_code=l['loai'],site_id=uid('site:'+l['ban']),qty_basis='estimated' if l['uoc_tinh'] else 'weighed',declared_qty=int(Decimal(l['luong_kg'])*1000),available_from=l['ngay_co_hang'],spray_clear_on=l['het_cach_ly'],ask_price_vnd=l['gia_mong_muon'],last_confirmed_at=T,status={'dang_ban':'on_sale','sap_co_hang':'upcoming','nhap':'draft'}[l['trang_thai']],created_at=T)
 if l['gia_mong_muon']:
  ins('core.lot_price_versions',lot_id=uid(l['ma']),ask_price_vnd=l['gia_mong_muon'],floor_price_vnd=l['gia_thap_nhat_kin'],set_at=T)
 # Lô nháp chưa có sổ lượng theo 03: chỉ khai nguồn khi đăng/tách.
for n in x['nhu_cau']:
 org=next(o for o in orgs if o['ma']==n['mua']);seg=segment[org['phan_khuc'][0]]
 sql('INSERT INTO core.demands(id,code,buyer_org_id,segment_code,product_id,profile_version,needed_during,delivery_mode,delivery_facility_id,demand_form,required_docs,status,created_at) VALUES('+','.join([q(uid(n['ma'])),q(n['ma']),q(uid(n['mua'])),q(seg),q(uid(n['dong'][0]['mat_hang'])),'1',"daterange("+q(n['cua_so'][0])+','+q(n['cua_so'][1])+"::date+1,'[)')",q('delivered' if n['kieu_giao']=='tai_kho_ben_mua' else 'self_pickup'),q(uid('facility:'+n['mua'])),q({'can_gom':'needs_pooling','lo_mot_lan':'single_lot'}[n['dang']]),arr(n['giay_to_bat_buoc']),"'open'",q(T)])+')')
 for i,line in enumerate(n['dong']):
  ins('core.demand_lines',id=uid(n['ma']+':'+str(i+1)),demand_id=uid(n['ma']),grade_code=line['loai'][0],qty=int(Decimal(line['kg'])*1000),min_source_qty=line.get('kg_toi_thieu_moi_nguon',20)*1000)
  ins('core.demand_line_max_prices',demand_line_id=uid(n['ma']+':'+str(i+1)),max_price_vnd=line['gia_toi_da_kin'],set_at=T)
for h in x['don_nen']:
 ins('core.historical_trades',id=uid(h['ma']),code=h['ma'],buyer_org_id=uid(h['mua']),seller_org_id=uid(h['ban']),product_id=uid(h['mat_hang']),grade_code=h['loai'],qty=h['kg_dat']*1000,unit_price_vnd=h['gia'],accepted_at=h['chot_ngay']+'T12:00:00+07:00',province_code='DT',excluded_from_ref_price=h.get('loai_khoi_gia_tham_khao',False),is_test_data=True,source_key='du-lieu-ao.json')
for g in x['gia_tham_khao']:ins('mkt.external_prices',product_id=uid(g['mat_hang']),grade_code=g['loai'],unit_price_vnd=g['gia'],source_label='Giá giả định từ JSON, không dùng tính cọc',observed_on=g['den_ngay'],is_test_data=True)
for f in x['hop_dong_khung']:
 code=f['ma'];sql('INSERT INTO core.framework_contracts(id,code,buyer_org_id,seller_org_id,segment_code,schedule,price_period,billing_period,framework_deposit_vnd,extra_credit_vnd,fee_bps,active_during,policy_version_id,status) VALUES('+','.join([q(uid(code)),q(code),q(uid(f['mua'])),q(uid(f['ban'])),"'horeca'",q({'lich':f['lich'],'mon':f['mon']}),"'week'","'week'",q(f['coc_khung']),q(f['cho_no_them']),q(100 if f['mua']=='TC-M06' else 0),"daterange('2026-10-01','2027-01-01','[)')",'1',"'running'"])+')')
 ins('core.deposits',id=uid('deposit:'+code),framework_id=uid(code),payer_org_id=uid(f['mua']),expected_deposit_vnd=f['coc_khung'],expected_fee_vnd=0,payment_ref='AGV '+code+' COC',virtual_account_no='THU-COC-'+code)
 sql("PERFORM ledger.post('imported_framework_deposit',NULL,"+q('imported-deposit:'+code)+","+q('Số dư đầu kỳ nhập khẩu '+code+' từ du-lieu-ao.json')+",jsonb_build_array(jsonb_build_object('type','deposit_escrow','framework',"+q(uid(code))+",'amount',"+q(f['coc_khung'])+"),jsonb_build_object('type','external','org',"+q(uid(f['mua']))+",'amount',"+q(-f['coc_khung'])+")),now(),NULL,NULL,jsonb_build_object('framework',"+q(uid(code))+"))")
 sql("UPDATE core.deposits SET status='held' WHERE id="+q(uid('deposit:'+code)))
 ins('core.framework_opening_exposures',framework_id=uid(code),unpaid_delivered_vnd=f.get('da_giao_chua_tra',0),scheduled_vnd=f.get('da_chot_sap_giao',0),source_key='du-lieu-ao.json',as_of=T)
for o in x['bao_tieu']:
 ins('core.imported_offtake_plans',id=uid(o['ma']),code=o['ma'],buyer_org_id=uid(o['mua']),seller_org_id=uid(o['ban']),product_id=uid(o['mat_hang']),grade_code=o['loai'],deposit_vnd=o['coc_vu'],materials_advance_vnd=o['vat_tu_ung'],formula_text=o['cong_thuc_gia'],payment_after_days=o['han_tra_dot_ngay'],source_key='du-lieu-ao.json')
 for b in o['dot']:ins('core.imported_offtake_batches',plan_id=uid(o['ma']),batch_no=b['so'],committed_qty=b['kg_cam_ket']*1000,materials_offset_vnd=o['tru_vat_tu_moi_dot'],source_status=b['trang_thai'])
for partner in x['doi_tac']:
 for v in partner.get('xe',[]):ins('core.vehicles',id=uid(v['bien_so']),org_id=uid(partner['ma']),plate_no=v['bien_so'],kind='reefer' if v['loai']=='lanh' else 'normal',capacity_qty=v['tai_kg']*1000)
for o in x['to_chuc_mua']:
 for r in o.get('nhan_hang_kem_loai',[]):
  sql('INSERT INTO core.substandard_receivers(buyer_org_id,product_id,grade_codes,min_qty,radius_km,standing_price_vnd,is_offtake_partner,floor_price_vnd,valid_during) VALUES('+','.join([q(uid(o['ma'])),q(uid(r['mat_hang'])),arr([r['loai']]),q(r.get('kg_toi_thieu',0)*1000),q(r.get('ban_kinh_km',100)),q(r.get('gia_chao_san')),q(o['ma']=='TC-M04'),q(r.get('gia_san',r.get('gia_san_bao_tieu',5000)) if o['ma']=='TC-M04' else None),"daterange('2026-10-01','2027-01-01','[)')"])+')')
sql('REFRESH MATERIALIZED VIEW mkt.reference_prices')
sql("PERFORM set_config('app.allow_any_initial','off',true)")
# Không có bản PDF/đơn chi tiết quá khứ trong nguồn: bảo toàn nguyên bản bao_tieu trong seed_sources.
header="-- Tự sinh từ du-lieu-ao.json bằng db/tools/tao-seed.py. Không sửa tay.\nDO $seed$ BEGIN\nIF EXISTS(SELECT 1 FROM ops.seed_sources WHERE source_key='du-lieu-ao.json') THEN\n IF NOT EXISTS(SELECT 1 FROM ops.seed_sources WHERE source_key='du-lieu-ao.json' AND sha256=decode('"+digest+"','hex')) THEN RAISE EXCEPTION 'Nguồn seed đổi: dùng DB thử mới'; END IF;\n RETURN; END IF;\n"
(ROOT/'db/seed/000_du_lieu_ao.sql').write_text(header+'\n'.join(s)+'\nEND $seed$;\n')
print('Đã sinh db/seed/000_du_lieu_ao.sql; SHA-256 '+digest)
