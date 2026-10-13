import {test} from 'node:test';
import assert from 'node:assert/strict';
import {globePixel} from '../src/planet';
test('globe colors wrap at longitude, preserve ice caps and cover both oceans and land',()=>{
  assert.deepEqual(globePixel(1,0,0),globePixel(Math.cos(2*Math.PI),0,Math.sin(2*Math.PI)));
  assert.deepEqual(globePixel(0,1,0),[184,211,216,255]);assert.deepEqual(globePixel(0,-1,0),[184,211,216,255]);
  const colors=Array.from({length:180},(_,i)=>globePixel(Math.cos(i*Math.PI/90),0,Math.sin(i*Math.PI/90)));
  assert.ok(colors.some(c=>c[2]>c[1]));assert.ok(colors.some(c=>c[1]>c[2]));assert.ok(colors.every(c=>c.every(v=>v>=0&&v<=255)));
});
