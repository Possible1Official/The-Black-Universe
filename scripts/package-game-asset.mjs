// Only game-specific optimized derivatives may be packaged; never raw stock sources.
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {randomBytes,createCipheriv,createHash} from 'node:crypto';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Supply optimized GLB and .ebup output');
const glb=fs.readFileSync(input);if(glb.readUInt32LE(0)!==0x46546c67)throw Error('Expected optimized GLB');
const magic=Buffer.from('EBU1'),iv=randomBytes(12),key=createHash('sha256').update('erebus-game-resource-v1').digest(),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(magic);
const bytes=Buffer.concat([magic,iv,cipher.update(gzipSync(glb,{level:9})),cipher.final(),cipher.getAuthTag()]);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,bytes);console.log(JSON.stringify({resource:path.basename(output),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}));
