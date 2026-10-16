export type TerrainMesh={vertices:Float32Array;indices:Uint32Array};
type Point={x:number;y:number;z:number};
/** Clip the seed's connected flooded basin to the exact terrain triangles. */
export function pondGeometry(terrain:TerrainMesh,level:number,seed={x:32,z:34}){
 const {vertices:v,indices}=terrain,count=v.length/3,wet=new Uint8Array(count),adjacent:number[][]=Array.from({length:count},()=>[]);
 let first=-1,nearest=9;
 for(let i=0;i<count;i++)if(v[i*3+1]<level){wet[i]=1;const d=(v[i*3]-seed.x)**2+(v[i*3+2]-seed.z)**2;if(d<nearest){first=i;nearest=d;}}
 for(let i=0;i<indices.length;i+=3)for(let a=0;a<3;a++){
  const x=indices[i+a],y=indices[i+(a+1)%3];if(wet[x]&&wet[y]){adjacent[x].push(y);adjacent[y].push(x);}
 }
 const connected=new Uint8Array(count),queue:number[]=[];
 if(first>=0){queue.push(first);connected[first]=1;}
 for(let cursor=0;cursor<queue.length;cursor++)for(const id of adjacent[queue[cursor]])if(!connected[id]){connected[id]=1;queue.push(id);}
 const positions:number[]=[],depths:number[]=[];
 for(let i=0;i<indices.length;i+=3){
  const ids=[indices[i],indices[i+1],indices[i+2]];if(!ids.some(id=>connected[id]))continue;
  const triangle=ids.map(id=>({x:v[id*3],y:v[id*3+1],z:v[id*3+2]})),polygon:Point[]=[];
  for(let edge=0;edge<3;edge++){
   const a=triangle[edge],b=triangle[(edge+1)%3],inside=a.y<level,next=b.y<level;
   if(inside)polygon.push(a);
   if(inside!==next){const t=(level-a.y)/(b.y-a.y);polygon.push({x:a.x+(b.x-a.x)*t,y:level,z:a.z+(b.z-a.z)*t});}
  }
  for(let j=1;j+1<polygon.length;j++){
   const points=[polygon[0],polygon[j],polygon[j+1]],area=(points[1].x-points[0].x)*(points[2].z-points[0].z)-(points[1].z-points[0].z)*(points[2].x-points[0].x);
   if(Math.abs(area)<1e-9)continue;
   for(const p of points){positions.push(p.x,level,p.z);depths.push(level-p.y);}
  }
 }
 return {positions:new Float32Array(positions),depths:new Float32Array(depths),connectedVertices:queue.length};
}
