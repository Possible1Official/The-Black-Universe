import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {decodeGameResource} from '../src/game-resource';
export async function modelFixture(kind:string){
 const b=Buffer.from(await decodeGameResource(Uint8Array.from(readFileSync('src/assets/requested/'+kind+'.ebup')).buffer)),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n).toString()),binary=b.subarray(28+n);
 // Actual shipped geometry, omitting image decoding only in this Node fixture.
 g.materials=[{}];g.images=[];g.textures=[];for(const m of g.meshes)for(const p of m.primitives)p.material=0;
 const j=Buffer.from(JSON.stringify(g)),pad=Buffer.alloc((4-j.length%4)%4,32),h=Buffer.alloc(20),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+j.length+pad.length+binary.length,8);h.writeUInt32LE(j.length+pad.length,12);h.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);const out=Buffer.concat([h,j,pad,bh,binary]);return new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),'');
}
