import { Api } from '../shared/api.js';
import { readCases, testAccess, casePath } from './case-engine.js';
const status=document.querySelector('#status');
try {
  const api=new Api(); await testAccess(api);
  const params=new URLSearchParams(location.search), side=params.get('side');
  const record=readCases().find(r=>r.id===params.get('case'));
  if(!record || !['seller','buyer'].includes(side)) throw new Error('Case không còn trong trình duyệt này hoặc thiếu phía cần mở.');
  const account=record[side], result=await api.post('/v1/test/impersonate',{phone:account.phone,org_code:account.org_code});
  const app=side==='seller'?'ban':'mua';
  sessionStorage.setItem('agv-session-'+app,JSON.stringify({token:result.token}));
  // Token chỉ ở phiên tab mới, không có trong URL, localStorage hay cửa sổ quản trị.
  location.replace('/'+app+'/#/'+casePath(record));
} catch(error) {status.textContent='Chưa mở được case: '+error.message;status.setAttribute('role','alert');}
