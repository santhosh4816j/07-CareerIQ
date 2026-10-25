import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {randomUUID} from 'node:crypto';import {makeRecord,stats,insight,csv} from './engine.js';
const root=path.dirname(fileURLToPath(import.meta.url));const config=JSON.parse(fs.readFileSync(path.join(root,'config.json'),'utf8'));const dataFile=path.join(root,'data.json');let db;
try{db=JSON.parse(fs.readFileSync(dataFile,'utf8'))}catch{db={records:config.seed.map(r=>makeRecord(config.fields,r)),events:[]}};
const save=()=>fs.writeFileSync(dataFile,JSON.stringify(db,null,2));save();
const reply=(res,code,obj,kind='application/json')=>{res.writeHead(code,{'Content-Type':kind,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(kind==='application/json'?JSON.stringify(obj):obj)};
const parse=async req=>{let b='',n=0;for await(const chunk of req){n+=chunk.length;if(n>1e6)throw Error('Request body too large');b+=chunk}return JSON.parse(b||'{}')};
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');const p=u.pathname;
if(p==='/health')return reply(res,200,{ok:true,project:config.name});
if(p==='/api/config')return reply(res,200,config);
if(p==='/api/records'&&req.method==='GET'){const q=(u.searchParams.get('q')||'').toLowerCase();return reply(res,200,db.records.filter(r=>Object.values(r).some(v=>String(v).toLowerCase().includes(q))))}
if(p==='/api/records'&&req.method==='POST'){const record=makeRecord(config.fields,await parse(req));db.records.unshift(record);db.events.unshift({id:randomUUID(),action:'CREATED',target:record.id,at:new Date().toISOString()});save();return reply(res,201,record)}
const m=p.match(/^\/api\/records\/([a-f0-9-]+)$/);
if(m&&req.method==='DELETE'){const old=db.records.length;db.records=db.records.filter(r=>r.id!==m[1]);if(old===db.records.length)return reply(res,404,{error:'Not found'});db.events.unshift({id:randomUUID(),action:'DELETED',target:m[1],at:new Date().toISOString()});save();return reply(res,200,{ok:true})}
if(m&&req.method==='PATCH'){const i=db.records.findIndex(r=>r.id===m[1]);if(i<0)return reply(res,404,{error:'Not found'});const next=makeRecord(config.fields,{...db.records[i],...await parse(req)});db.records[i]={...next,id:m[1],createdAt:db.records[i].createdAt};db.events.unshift({id:randomUUID(),action:'UPDATED',target:m[1],at:new Date().toISOString()});save();return reply(res,200,db.records[i])}
if(p==='/api/stats')return reply(res,200,{...stats(db.records,config.fields),events:db.events.slice(0,15),insights:db.records.slice(0,10).map(r=>({id:r.id,...insight(config.domain,r)}))});
if(p==='/api/export')return reply(res,200,csv(db.records,config.fields),'text/csv; charset=utf-8');
if(p.startsWith('/api/'))return reply(res,404,{error:'Unknown endpoint'});
const safe=p==='/'?'index.html':p.slice(1);if(!['index.html','app.js','style.css'].includes(safe))return reply(res,404,'Not found','text/plain');const file=path.join(root,'public',safe);const mime=safe.endsWith('.js')?'text/javascript':safe.endsWith('.css')?'text/css':'text/html';return reply(res,200,fs.readFileSync(file,'utf8'),mime+'; charset=utf-8');
}catch(e){reply(res,400,{error:e.message||'Request failed'})}});
server.listen(config.port,'127.0.0.1',()=>console.log(`${config.name} → http://localhost:${config.port}`));
