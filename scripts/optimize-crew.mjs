// Offline, lossless texture optimization. No runtime dependency or credentials.
// node scripts/optimize-crew.mjs <Blender GLB> <optimized GLB> <report.json>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const [input,output,reportPath]=process.argv.slice(2);
if(!input||!output||!reportPath)throw new Error('Supply input GLB, output GLB and report paths');
const hash=data=>createHash('sha256').update(data).digest('hex');
const original=fs.readFileSync(input);
if(original.readUInt32LE(0)!==0x46546c67||original.readUInt32LE(4)!==2||original.readUInt32LE(8)!==original.length)throw new Error('Invalid GLB 2 header');
const length=original.readUInt32LE(12),json=JSON.parse(original.subarray(20,20+length).toString());
if(original.readUInt32LE(16)!==0x4e4f534a||original.readUInt32LE(24+length)!==0x004e4942||json.buffers.length!==1||json.buffers[0].uri)throw new Error('Expected self-contained JSON/BIN GLB');
const bin=original.subarray(28+length),replacements=new Map(),images=[];
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'erebus-crew-'));
const run=args=>{const r=spawnSync('ffmpeg',['-v','error',...args],{maxBuffer:32_000_000});if(r.status!==0)throw new Error('FFmpeg conversion failed');return r.stdout;};
try{
  for(const [i,image] of json.images.entries()){
    if(image.uri||image.mimeType!=='image/png')throw new Error('Expected embedded PNG source maps');
    const view=json.bufferViews[image.bufferView],png=bin.subarray(view.byteOffset,view.byteOffset+view.byteLength);
    const source=path.join(temp,`${i}.png`),target=path.join(temp,`${i}.webp`);fs.writeFileSync(source,png);
    run(['-i',source,'-c:v','libwebp','-lossless','1','-compression_level','6',target]);
    const raw=run(['-i',source,'-f','rawvideo','-pix_fmt','rgba','-']);
    const decoded=run(['-i',target,'-f','rawvideo','-pix_fmt','rgba','-']);
    if(!raw.equals(decoded))throw new Error('Texture pixels changed; source/output were not published');
    const webp=fs.readFileSync(target);if(webp.length>=png.length)throw new Error('Texture compression did not improve the budget');
    replacements.set(image.bufferView,webp);image.mimeType='image/webp';
    images.push({name:image.name,width:png.readUInt32BE(16),height:png.readUInt32BE(20),source_bytes:png.length,output_bytes:webp.length,rgba_sha256:hash(raw),pixels_equal:true});
  }
  // EXT_texture_webp is required because the embedded sources have no PNG fallback.
  // GLTFLoader and the supported modern browsers decode WebP natively.
  for(const texture of json.textures){texture.extensions??={};texture.extensions.EXT_texture_webp={source:texture.source};delete texture.source;}
  json.extensionsUsed=[...new Set([...(json.extensionsUsed??[]),'EXT_texture_webp'])];
  json.extensionsRequired=[...new Set([...(json.extensionsRequired??[]),'EXT_texture_webp'])];
  const retained=[],chunks=[];let offset=0;
  for(const [i,view] of json.bufferViews.entries()){
    if(view.buffer!==0||(view.byteOffset??0)+view.byteLength>bin.length)throw new Error('Invalid source buffer view');
    const bytes=replacements.get(i)??bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
    if(!replacements.has(i))retained.push({index:i,bytes:bytes.length,sha256:hash(bytes)});
    view.byteOffset=offset;view.byteLength=bytes.length;chunks.push(bytes);
    const padding=Buffer.alloc((4-bytes.length%4)%4);chunks.push(padding);offset+=bytes.length+padding.length;
  }
  const rebuilt=Buffer.concat(chunks);json.buffers[0].byteLength=rebuilt.length;
  const encoded=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(encoded.length/4)*4,32);encoded.copy(padded);
  const result=Buffer.alloc(28+padded.length+rebuilt.length);
  result.writeUInt32LE(0x46546c67,0);result.writeUInt32LE(2,4);result.writeUInt32LE(result.length,8);result.writeUInt32LE(padded.length,12);result.writeUInt32LE(0x4e4f534a,16);padded.copy(result,20);
  result.writeUInt32LE(rebuilt.length,20+padded.length);result.writeUInt32LE(0x004e4942,24+padded.length);rebuilt.copy(result,28+padded.length);
  const report={format:'lossless-webp',source_sha256:hash(original),output_sha256:hash(result),source_bytes:original.length,output_bytes:result.length,images,retained_buffer_views:retained};
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,result);fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({source_bytes:original.length,output_bytes:result.length,saved_bytes:original.length-result.length,pixels_equal:images.every(i=>i.pixels_equal)}));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
