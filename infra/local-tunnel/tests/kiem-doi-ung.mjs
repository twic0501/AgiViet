// Stack cô lập PGlite cho các luồng đối ứng, không chạm PG/tunnel thật.
import net from 'node:net';
import {spawn} from 'node:child_process';import {once} from 'node:events';import {mkdtemp} from 'node:fs/promises';
const state=await mkdtemp('/tmp/agv-opponent-');
const startPort=Number(process.env.AUTO_BASE_PORT||38000);
if(!Number.isInteger(startPort)||startPort<1024||startPort>64646)throw new Error('AUTO_BASE_PORT ngoài khoảng cổng thử.');
// Không dùng một service đang chiếm cổng làm fixture rồi reset nhầm DB.
const probes=[];try {for(const offset of [80,90,91,888,889]){const server=net.createServer();probes.push(server);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(startPort+offset,'127.0.0.1',resolve);});}}finally{await Promise.all(probes.filter(s=>s.listening).map(s=>new Promise(resolve=>s.close(resolve))));}
const env={...process.env,STATE:state,CADDY_PORT:String(startPort+888),OPERATOR_PORT:String(startPort+889),PILOT_PORT:String(startPort+91),FRONTEND_PORT:String(startPort+90),BACKEND_PORT:String(startPort+80),PILOT_PASSWORD:'fixture-only',PILOT_COOKIE_SECRET:'fixture-secret-only',HOST:'127.0.0.1',AGV_PGLITE_DIR:'',AGV_DOC_DIR:state+'/docs',LOG_LEVEL:'warn',AGV_MOI_TRUONG:'thu',API_ORIGIN:'http://127.0.0.1:'+(startPort+80)};delete env.DATABASE_URL;delete env.AGV_TEST_PG_OWNER_URL;delete env.AGV_TEST_PG_TEMPLATE;
const start=(args,extra={})=>spawn(args[0],args.slice(1),{env:{...env,...extra},stdio:'ignore'});
const backend=start([process.execPath,'--import','./backend/node_modules/tsx/dist/loader.mjs','backend/src/server.ts'],{PORT:env.BACKEND_PORT});
const frontend=start([process.execPath,'--import','./infra/local-tunnel/loopback.mjs','frontend/server.mjs'],{PORT:env.FRONTEND_PORT});
const pilot=start([process.execPath,'infra/local-tunnel/pilot.mjs']);
const caddy=start(['infra/.local/oracle-guard/bin/caddy','run','--config','infra/local-tunnel/Caddyfile','--adapter','caddyfile'],{XDG_DATA_HOME:state+'/data',XDG_CONFIG_HOME:state+'/config'});
try {
 for(let n=0;n<90;n++){try{const r=await fetch(env.API_ORIGIN+'/health/ready');if(r.ok)break;}catch{}if(n===89)throw new Error('Backend không sẵn sàng');await new Promise(r=>setTimeout(r,1000));}
 const test=spawn(process.execPath,['frontend/tests/opponent-flow.mjs'],{env:{...env,FRONTEND_URL:'http://127.0.0.1:'+env.OPERATOR_PORT,AUTO_PILOT_PASSWORD:env.PILOT_PASSWORD,AUTO_RESET:'1'},stdio:'inherit'});const [code]=await once(test,'exit');process.exitCode=code;
} finally {for(const child of [caddy,pilot,frontend,backend]){child.kill('SIGTERM');if(child.exitCode===null)await once(child,'exit');}}
