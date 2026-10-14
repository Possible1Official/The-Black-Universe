// Game-specific resource encoding, not a credential or an unextractable DRM scheme.
// The public format key deters direct stock-model downloads; clients must decode it.
const MAGIC=new Uint8Array([69,66,85,49]);
export const FORMAT_LABEL='erebus-game-resource-v1';
export async function decodeGameResource(bytes:ArrayBuffer):Promise<ArrayBuffer>{
 const input=new Uint8Array(bytes);if(input.length<32||!MAGIC.every((v,i)=>input[i]===v))throw Error('Invalid game resource');
 const raw=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(FORMAT_LABEL));const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
 const decoded=await crypto.subtle.decrypt({name:'AES-GCM',iv:input.slice(4,16),additionalData:MAGIC},key,input.slice(16));return new Response(new Blob([decoded]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
