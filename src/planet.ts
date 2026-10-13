import * as THREE from 'three';
// Globe-space noise wraps continuously across the longitude seam.
const relief=(x:number,y:number,z:number)=>Math.sin(x*5.1+z*2.7)*Math.cos(y*4.8-z*2.2)+.4*Math.sin(z*9.1+y*3.8)*Math.cos(x*7.3)+.12*Math.sin(x*23+y*17-z*13);
export function globePixel(x:number,y:number,z:number):[number,number,number,number]{
  const h=relief(x,y,z);
  if(Math.abs(y)>.94)return [184,211,216,255];
  if(h>.15)return h>.85?[112,126,121,255]:h<.23?[166,160,119,255]:[62+Math.floor(h*22),106+Math.floor(h*18),88+Math.floor(h*8),255];
  const shallow=Math.max(0,1-Math.abs(h-.15)*2);return [19+Math.floor(shallow*14),53+Math.floor(shallow*34),78+Math.floor(shallow*30),255];
}
export function createPlanetTextures(){
  const width=1024,height=512,color=new Uint8Array(width*height*4),cloud=new Uint8Array(512*256*4);
  for(let j=0;j<height;j++)for(let i=0;i<width;i++){const lon=i/width*Math.PI*2,lat=(.5-j/height)*Math.PI,x=Math.cos(lat)*Math.cos(lon),y=Math.sin(lat),z=Math.cos(lat)*Math.sin(lon);color.set(globePixel(x,y,z),(j*width+i)*4);}
  for(let j=0;j<256;j++)for(let i=0;i<512;i++){const lon=i/512*Math.PI*2,lat=(.5-j/256)*Math.PI,x=Math.cos(lat)*Math.cos(lon),y=Math.sin(lat),z=Math.cos(lat)*Math.sin(lon);const n=relief(x+1.2,y-.4,z+.8)+.35*Math.sin(y*35+z*7);cloud.set([218,236,242,Math.floor(Math.max(0,Math.min(1,(n-.25)*.7))*165)],(j*512+i)*4);}
  const texture=(data:Uint8Array,w:number,h:number)=>{const t=new THREE.DataTexture(data,w,h);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;};
  return {color:texture(color,width,height),clouds:texture(cloud,512,256)};
}
