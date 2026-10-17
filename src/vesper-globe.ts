import * as THREE from 'three';import {VESPER,VESPER_RADIUS} from './vesper';
/** Locally generated frozen-world albedo, not a stock terrain asset. */
export function createVesperGlobe(){
 const w=512,h=256,pixels=new Uint8Array(w*h*4),dark=new THREE.Color(0x505b70),ice=new THREE.Color(0xc2dce2),c=new THREE.Color();
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=x/w*Math.PI*2,v=y/h*Math.PI,px=Math.sin(v)*Math.cos(u),py=Math.cos(v),pz=Math.sin(v)*Math.sin(u);const grain=.5+.23*Math.sin(px*23+pz*17)*Math.cos(py*19)+.15*Math.sin(px*61-py*47+pz*31),frost=Math.max(0,Math.min(1,Math.abs(py)*.6+grain*.7));c.copy(dark).lerp(ice,frost);pixels.set([c.r*255,c.g*255,c.b*255,255],(y*w+x)*4);}
 const map=new THREE.DataTexture(pixels,w,h);map.wrapS=THREE.RepeatWrapping;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;
 const globe=new THREE.Mesh(new THREE.SphereGeometry(VESPER_RADIUS,48,32),new THREE.MeshStandardMaterial({map,roughness:.95}));globe.name='Vesper';globe.position.set(VESPER.x,VESPER.y,VESPER.z);return globe;
}
