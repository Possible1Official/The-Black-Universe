import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
// @ts-ignore Node-only private-session utility, not a client module.
import {saveBrowserSession,restoreBrowserSession} from '../scripts/browser-session.mjs';
test('private state is atomic, permission-restricted and limited to CGTrader; session cookies are restored',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'erebus-session-')),file=path.join(dir,'private','state.json');
 try{
  const cookie={name:'fixture',value:'test-only',domain:'.cgtrader.com',path:'/',expires:-1,httpOnly:true,secure:true,sameSite:'Lax'};
  await saveBrowserSession({storageState:async()=>({cookies:[cookie,{...cookie,domain:'.cgtrader.com.evil.test'}],origins:[{origin:'https://www.cgtrader.com',localStorage:[{name:'fixture',value:'test-only'}]},{origin:'https://example.com',localStorage:[]}]})},file);
  assert.equal((await fs.stat(file)).mode&0o777,0o600);assert.equal((await fs.stat(path.dirname(file))).mode&0o777,0o700);
  assert.deepEqual(await fs.readdir(path.dirname(file)),['state.json']);
  let cookies:any,origins:any;
  assert.equal(await restoreBrowserSession({addCookies:async(c:any)=>cookies=c,addInitScript:async(_:any,o:any)=>origins=o},file),true);
  assert.deepEqual(cookies,[cookie]);assert.equal(cookies[0].expires,-1);assert.equal(origins.length,1);assert.equal(origins[0].origin,'https://www.cgtrader.com');
  assert.equal(await restoreBrowserSession({},path.join(dir,'missing')),false);
  await fs.writeFile(file,'{"secret":"fixture"}');await assert.rejects(restoreBrowserSession({},file),/could not be restored/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
