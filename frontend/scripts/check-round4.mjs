// Chạy tuần tự vì cả ba bộ UI cùng đặt lại dữ liệu backend.
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
const root=new URL('../../',import.meta.url), dir=new URL('docs/frontend/',root);
const report={started_at:new Date().toISOString(),health:await (await fetch('http://127.0.0.1:8080/health')).json(),frontend:'http://127.0.0.1:8090',runs:[]};
for(const name of ['test','test:branches','test:round2','test:e2e']) {
  const started_at=new Date().toISOString(),log='kiem-thu-luot-4-'+name.replace(':','-')+'.log';
  const out=createWriteStream(new URL(log,dir));
  const exit_code=await new Promise((resolve,reject)=>{
    const child=spawn('npm',name==='test'?['test']:['run',name],{cwd:new URL('frontend/',root),stdio:['ignore','pipe','pipe']});
    child.stdout.pipe(out,{end:false});child.stderr.pipe(out,{end:false});child.on('error',reject);child.on('close',resolve);
  });
  await new Promise(resolve=>out.end(resolve));
  report.runs.push({command:name==='test'?'npm test':'npm run '+name,started_at,finished_at:new Date().toISOString(),exit_code,log});
  await writeFile(new URL('kiem-thu-luot-4.json',dir),JSON.stringify(report,null,2));
  console.log(name+' exit '+exit_code);
}
report.finished_at=new Date().toISOString();
await writeFile(new URL('kiem-thu-luot-4.json',dir),JSON.stringify(report,null,2));
if(report.runs.some(r=>r.exit_code!==0))process.exitCode=1;
