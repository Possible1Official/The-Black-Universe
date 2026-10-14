import {chromium} from '@playwright/test';
import {saveBrowserSession,restoreBrowserSession} from './browser-session.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'erebus-session-qa-')),file=path.join(dir,'private','state.json');
let browser;
try{
 browser=await chromium.launch({args:['--no-sandbox']});let context=await browser.newContext();
 await context.route('https://www.cgtrader.com/**',r=>r.fulfill({contentType:'text/html',body:'<title>Local session fixture</title>'}));
 await context.addCookies([{name:'fixture',value:'test-only',domain:'.cgtrader.com',path:'/',httpOnly:true,secure:true,sameSite:'Lax'}]);
 let page=await context.newPage();await page.goto('https://www.cgtrader.com/fixture');await page.evaluate(()=>localStorage.setItem('fixture','test-only'));await saveBrowserSession(context,file);await browser.close();
 browser=await chromium.launch({args:['--no-sandbox']});context=await browser.newContext();assert.equal(await restoreBrowserSession(context,file),true);
 await context.route('https://www.cgtrader.com/**',r=>r.fulfill({contentType:'text/html',body:'<title>Local session fixture</title>'}));
 page=await context.newPage();await page.goto('https://www.cgtrader.com/fixture');assert.equal(await page.evaluate(()=>localStorage.getItem('fixture')),'test-only');const cookies=await context.cookies();assert.equal(cookies.find(c=>c.name==='fixture')?.value,'test-only');assert.equal(cookies.find(c=>c.name==='fixture')?.expires,-1);
 console.log(JSON.stringify({browserRestart:true,sessionCookie:true,localStorage:true,network:'all fixture requests fulfilled locally',realCredentialsUsed:false}));
}finally{await browser?.close();await fs.rm(dir,{recursive:true,force:true});}
