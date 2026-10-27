import {writeFileSync} from 'node:fs';
import {CA_KIEM_THU_BAN,chayCa} from '/home/twictrn/agiviet-he-thong/.claude/worktrees/he-thong-v4/dong-co/packages/may-chu/src/ca-kiem-thu.ts';
import {CA_KIEM_THU_MUA} from '/home/twictrn/agiviet-he-thong/.claude/worktrees/he-thong-v4/dong-co/packages/may-chu/src/ca-kiem-thu-mua.ts';
const data=[...CA_KIEM_THU_BAN,...CA_KIEM_THU_MUA].map(c=>{const r=chayCa(c);return {id:c.ma,name:c.ten,expect:c.kyVong,pass:r.dat,checks:r.kiemTra,error:r.loi,screen:r.man}});
writeFileSync(new URL('../du-lieu/kiem-thu-mau1.json',import.meta.url),JSON.stringify({at:new Date().toISOString(),source:'M1-src worktree; in-memory, no live browser',data},null,2));
console.log('M1',data.filter(x=>x.pass).length+'/'+data.length,'assertions',data.reduce((n,x)=>n+x.checks.length,0));for(const r of data.filter(x=>!x.pass))console.log(r);
