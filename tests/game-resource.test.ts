import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createCipheriv,createHash} from 'node:crypto';
import {decodeGameResource,FORMAT_LABEL} from '../src/game-resource';
test('game resource round-trip verifies format and integrity; corruption is rejected',async()=>{
 const magic=Buffer.from('EBU1'),iv=Buffer.alloc(12,3),cipher=createCipheriv('aes-256-gcm',createHash('sha256').update(FORMAT_LABEL).digest(),iv);cipher.setAAD(magic);const plain=Buffer.from('fixture game-specific model data'),bytes=Buffer.concat([magic,iv,cipher.update(gzipSync(plain)),cipher.final(),cipher.getAuthTag()]);
 const array=(b:Buffer)=>Uint8Array.from(b).buffer;assert.equal(Buffer.from(await decodeGameResource(array(bytes))).toString(),plain.toString());await assert.rejects(decodeGameResource(new ArrayBuffer(0)),/Invalid/);bytes[20]^=1;await assert.rejects(decodeGameResource(array(bytes)));
});
