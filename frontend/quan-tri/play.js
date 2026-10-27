import {Api} from '../shared/api.js';
import {readCases,testAccess,actor,casePath} from './case-engine.js';
import {profileById,decision} from './profiles.js';
import {Opponent} from './opponent.js';
const status=document.querySelector('#status'),frame=document.querySelector('#app-frame'),toggle=document.querySelector('#toggle'),refresh=document.querySelector('#refresh');
let paused=false,stopped=false,busy=false,opponent,tickTask=Promise.resolve();
window.addEventListener('pagehide',()=>{stopped=true;opponent?.stop();});
function log() {
  document.querySelector('#log').replaceChildren(...(opponent.record.opponentLog||[]).map(l=>{const li=document.createElement('li');li.textContent=l.action;return li;}));
}
try {
  const api=new Api({deviceId:'agv-opponent',storage:sessionStorage});await testAccess(api);
  const params=new URLSearchParams(location.search),side=params.get('side');
  const record=readCases().find(r=>r.id===params.get('case'));
  if(!record || !['seller','buyer'].includes(side)) throw new Error('Chưa có case hoặc phía cần mở.');
  const app=side==='seller'?'ban':'mua',user=await actor(api,record[side]);
  sessionStorage.setItem('agv-session-'+app,JSON.stringify({token:user.api.token}));
  document.querySelector('#story').textContent=profileById(record.profile)?.story || 'Thử tiếp tình huống đã tạo. Đối ứng chỉ thao tác phía bên kia; các bước cần quyết định của bạn vẫn ở app.';
  document.querySelector('#actors').textContent=record.seller.display_name+' · '+record.seller.org_name+' / '+record.buyer.display_name+' · '+record.buyer.org_name;
  if(record.evidenceId) {
    const blob=await user.api.request('/v1/documents/'+record.evidenceId+'/file',{blob:true});
    const url=URL.createObjectURL(blob);document.querySelector('#evidence img').src=url;document.querySelector('#evidence').hidden=false;window.addEventListener('pagehide',()=>URL.revokeObjectURL(url),{once:true});
  }
  document.querySelector('#seed').textContent='Seed: '+(record.seed||'agiviet-27')+' · Các lựa chọn theo seed và sự kiện; nhật ký lưu trong case. Giữ tab này mở. Lỗi API sẽ tạm dừng, không báo đã xong.';
  opponent=new Opponent(api,record,side,message=>{status.textContent=message;log();});await opponent.start();log();
  if(record.profile==='arrival') {
    document.querySelector('#inspection').hidden=false;
    const form=document.querySelector('#inspection-form'),resultStatus=document.querySelector('#inspection-status');
    form.elements.result.value=decision(record.seed||'agiviet-27','inspection-result',['passed','failed','inconclusive']);
    form.onsubmit=async event=>{
      event.preventDefault();form.querySelector('button').disabled=toggle.disabled=true;
      try {await tickTask.catch(()=>{});busy=true;const result=await opponent.deliverInspectionResult(form.elements.result.value);resultStatus.textContent='Webhook đã ghi nhận · '+(result.status==='resolved'?'Hồ sơ đã giải quyết.':'Hồ sơ còn mở, chưa có kết luận cuối.')+' Bấm cập nhật app để đọc lại.';}
      catch(err) {resultStatus.textContent='Chưa giao được kết quả: '+err.message+(err.requestId?' · '+err.requestId:'');}
      finally {busy=false;form.querySelector('button').disabled=toggle.disabled=false;}
    };
  }
  frame.src='/'+app+'/#/'+casePath(record);frame.hidden=false;toggle.disabled=refresh.disabled=false;
  refresh.onclick=()=>{const target='/'+app+'/#/'+casePath(opponent.record);if(frame.contentWindow.location.pathname+frame.contentWindow.location.hash===target) frame.contentWindow.location.reload();else frame.src=target;};
  toggle.onclick=()=>{paused=!paused;toggle.textContent=paused?'Tiếp tục đối ứng':'Tạm dừng đối ứng';status.textContent=paused?'Đã tạm dừng phản hồi tự động.':'Đối ứng tiếp tục quan sát.';};
  status.textContent='Đối ứng đang quan sát. Thao tác trong app; bấm Cập nhật app sau phản hồi để đọc lại trạng thái.';
  // Một yêu cầu mỗi lượt, không gọi chồng; tab ẩn/ngừng được tạm nghỉ. Không chạy nền khi đóng.
  while(!stopped) {
    if(!paused && !busy && !document.hidden) {
      busy=true;
      try {
        if(side==='buyer') {const code=frame.contentDocument?.querySelector('[data-receipt-code]')?.textContent?.trim();if(/^\d{6}$/.test(code||''))opponent.receiptCode=code;}
        tickTask=opponent.tick();await tickTask;
      }
      catch(err) {paused=true;toggle.textContent='Tiếp tục đối ứng';status.textContent='Đối ứng đã dừng ở lỗi: '+err.message+(err.requestId?' · '+err.requestId:'')+'. Chưa hoàn tất; kiểm tra hồ sơ trước khi tiếp tục.';}
      finally {busy=false;}
    }
    await new Promise(resolve=>setTimeout(resolve,8000));
  }
} catch(err) {status.textContent='Chưa mở được: '+err.message;status.setAttribute('role','alert');}

