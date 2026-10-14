// Private asset-site sign-in state. Never import this Node helper into the game.
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const cgHost=host=>host==='cgtrader.com'||host.endsWith('.cgtrader.com');
function scoped(state){
 if(!state||!Array.isArray(state.cookies)||!Array.isArray(state.origins))throw Error('Invalid private browser state');
 return {cookies:state.cookies.filter(c=>typeof c.domain==='string'&&cgHost(c.domain.replace(/^\./,''))),origins:state.origins.filter(o=>{try{return cgHost(new URL(o.origin).hostname);}catch{return false;}})};
}
export async function saveBrowserSession(context,file){
 const state=scoped(await context.storageState()),dir=path.dirname(file);await fs.mkdir(dir,{recursive:true,mode:0o700});await fs.chmod(dir,0o700);
 const temp=`${file}.${randomUUID()}.tmp`;
 try{await fs.writeFile(temp,JSON.stringify(state),{mode:0o600,flag:'wx'});await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(()=>{});}
}
export async function restoreBrowserSession(context,file){
 let state;try{state=scoped(JSON.parse(await fs.readFile(file,'utf8')));}catch(error){if(error.code==='ENOENT')return false;throw Error('Private browser state could not be restored; no values were printed.');}
 await context.addCookies(state.cookies);
 await context.addInitScript(origins=>{const entry=origins.find(o=>o.origin===location.origin);if(entry)for(const item of entry.localStorage??[])localStorage.setItem(item.name,item.value);},state.origins);
 return state.cookies.length>0||state.origins.length>0;
}
