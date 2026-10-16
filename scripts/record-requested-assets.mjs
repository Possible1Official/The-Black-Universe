// Record only sanitized game derivative metadata; raw files/cookies remain ignored.
import fs from 'node:fs';
import crypto from 'node:crypto';
const definitions={
 grass:{creator:'Nicholas-3D',model_id:3875260,url:'https://www.cgtrader.com/free-3d-models/plant/grass/realistic-grass-pack-for-games',triangle_budget:100,transfer_budget:750000},
 rock:{creator:'dimdimich',model_id:898927,url:'https://www.cgtrader.com/free-3d-models/scanned/various/rock-pbr-game-ready',triangle_budget:1000,transfer_budget:1500000},
 canister:{creator:'desanlisadrien1',model_id:4044829,url:'https://www.cgtrader.com/free-3d-models/space/other/scifi-asset-pack',triangle_budget:1500,transfer_budget:450000},
 cargo:{creator:'desanlisadrien1',model_id:4044829,url:'https://www.cgtrader.com/free-3d-models/space/other/scifi-asset-pack',triangle_budget:600,transfer_budget:400000},
 resident:{creator:'seemlyhasan',model_id:2712319,url:'https://www.cgtrader.com/free-3d-models/character/woman/cute-girl-5122a81c-b888-4276-affd-71031a1ddb5a',triangle_budget:40000,transfer_budget:3000000},
 biker:{creator:'HRNLSTUDIO',model_id:3122428,url:'https://www.cgtrader.com/free-3d-models/character/sci-fi-character/cyber-biker-with-turbo-bike',triangle_budget:40000,transfer_budget:4000000,rights:'User states creator redistribution rights confirmed; independently unverified. CGTrader Royalty Free (no AI).'},
 bike:{creator:'HRNLSTUDIO',model_id:3122428,url:'https://www.cgtrader.com/free-3d-models/character/sci-fi-character/cyber-biker-with-turbo-bike',triangle_budget:40000,transfer_budget:3000000,rights:'Same user-confirmed creator permission as biker pack; independently unverified. CGTrader Royalty Free (no AI).'},
 rover:{creator:'dragosh21',model_id:4463132,url:'https://www.cgtrader.com/free-3d-models/vehicle/sci-fi-vehicle/sci-fi-rover-b8def830-308a-4377-8313-4218ac847aae',triangle_budget:40000,transfer_budget:4000000},
 corridor:{creator:'alitoons',model_id:7626256,url:'https://www.cgtrader.com/free-3d-models/space/other/free-sci-fi-corridor-starter-kit',triangle_budget:4000,transfer_budget:150000},
 bedroom:{creator:'MASSX-RZ',model_id:6444947,url:'https://www.cgtrader.com/free-3d-models/space/spaceship/sci-fi-bedroom-79647903-765e-4dc0-8502-6e3947156e8d',triangle_budget:60000,transfer_budget:5000000},
 interior:{creator:'MiskatonicStudio / Zaven Boyrazian',model_id:1902675,url:'https://www.cgtrader.com/free-3d-models/space/spaceship/intrepid-spaceship',triangle_budget:100000,transfer_budget:8000000,rights:'Listing states public domain; CGTrader badge Royalty Free (no AI).'},
 cockpit:{creator:'ViitorX',model_id:5370525,url:'https://www.cgtrader.com/free-3d-models/space/spaceship/spaceship-interior-bb77f232-02a0-498f-8a05-660d78a1a98c',triangle_budget:60000,transfer_budget:5000000},
 ship:{creator:'OK3D',model_id:2820144,url:'https://www.cgtrader.com/free-3d-models/space/spaceship/sci-fi-flying-ship',triangle_budget:60000,transfer_budget:8000000}
};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');const assets={};
for(const [kind,definition] of Object.entries(definitions)){
 const file=`src/assets/requested/${kind}.ebup`;if(!fs.existsSync(file))continue;
 const glb=fs.readFileSync(`.local/requested-optimized/${kind}.glb`),packed=fs.readFileSync(file);const gltf=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
 const primitives=gltf.meshes.flatMap(m=>m.primitives),triangles=primitives.reduce((sum,p)=>sum+(p.indices!==undefined?gltf.accessors[p.indices].count:gltf.accessors[p.attributes.POSITION].count)/3,0);
 const reportPath=`.local/requested-optimized/${kind==='bike'?'biker':kind}-report.json`,report=fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath,'utf8')):{};
 assets[kind]={...definition,source_sha256:report.source_sha256??report.source_archive_sha256??null,rights:definition.rights??'CGTrader Royalty Free License (no AI), incorporated derivative only.',glb_bytes:glb.length,glb_sha256:sha(glb),resource_bytes:packed.length,resource_sha256:sha(packed),triangles,primitives:primitives.length,images:gltf.images?.length??0,animations:gltf.animations?.map(a=>a.name)??[],source_retained_privately:true};
}
fs.mkdirSync('public/assets/requested',{recursive:true});fs.writeFileSync('public/assets/requested/provenance.json',JSON.stringify({format:'EBU1 gzip/AES-GCM game resource; public format key, extraction deterrence rather than unextractable DRM',assets},null,2)+'\n');console.log('Recorded '+Object.keys(assets).join(', '));
