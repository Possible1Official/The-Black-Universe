"""Fit the privately acquired CGTrader crate to Nysa; preserve mesh/PBR data.
Usage: python scripts/prepare-cargo.py <private-source.glb> <output.glb> <report.json>
Requires Pillow and numpy for bounded, renormalized tangent-normal reduction.
"""
import sys,json,struct,hashlib,io,pathlib
import numpy as np
from PIL import Image
source,output,report=map(pathlib.Path,sys.argv[1:]);raw=source.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[28+n:]
assert hashlib.sha256(raw).hexdigest()=='3d8682e3d4292b38eae663c2398b51564f3922647cdf4fdce10b77f2da0052db', 'Use the reviewed private source'
assert len(g['meshes'])==1 and len(g['meshes'][0]['primitives'])==1 and len(g['buffers'])==1
assert g['asset']['version']=='2.0' and len(g['nodes'])==1 and not g.get('animations') and not g.get('skins')
assert all(not b.get('uri')for b in g['buffers']) and all(not i.get('uri')for i in g['images'])
views=[];chunks=[];offset=0;image_audit=[];normal_indices={m['normalTexture']['index']for m in g['materials']if 'normalTexture'in m};normal_images={g['textures'][i]['source']for i in normal_indices};image_views={im['bufferView']:i for i,im in enumerate(g['images'])}
for i,v in enumerate(g['bufferViews']):
 data=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
 if i in image_views:
  index=image_views[i];im=Image.open(io.BytesIO(data));original=im.size;im=im.convert('RGB');im.thumbnail((512,512),Image.Resampling.LANCZOS)
  if index in normal_images:
   xyz=np.asarray(im,dtype=np.float32)/127.5-1;xyz/=np.maximum(np.linalg.norm(xyz,axis=2,keepdims=True),1e-8);im=Image.fromarray(np.clip((xyz+1)*127.5,0,255).round().astype(np.uint8))
  out=io.BytesIO();im.save(out,format='PNG',optimize=True);data=out.getvalue();image_audit.append({'name':g['images'][index].get('name'),'source_size':original,'size':im.size,'normal_renormalized':index in normal_images})
 v['byteOffset']=offset;v['byteLength']=len(data);views.append(v);padded=data+b'\0'*((-len(data))%4);chunks.append(padded);offset+=len(padded)
# Source is one translated mesh; all vertex/index/UV/tangent bytes stay intact.
a=g['accessors'][g['meshes'][0]['primitives'][0]['attributes']['POSITION']];lo=list(a['min']);hi=list(a['max']);translation=g['nodes'][0].get('translation',[0,0,0]);lo=[lo[i]+translation[i]for i in range(3)];hi=[hi[i]+translation[i]for i in range(3)];scale=1.25/(hi[0]-lo[0]);root={'name':'NysaFieldCache','children':[0],'scale':[scale]*3,'translation':[-(lo[0]+hi[0])/2*scale,.02-lo[1]*scale,-(lo[2]+hi[2])/2*scale]};g['nodes'].append(root);g['scenes'][g.get('scene',0)]['nodes']=[1];g['bufferViews']=views;g['buffers'][0]['byteLength']=offset;body=b''.join(chunks);j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);result=struct.pack('<III',0x46546c67,2,28+len(j)+len(body))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(body),0x004e4942)+body;output.parent.mkdir(parents=True,exist_ok=True);output.write_bytes(result)
sha=lambda b:hashlib.sha256(b).hexdigest();audit={'source_sha256':sha(raw),'source_bytes':len(raw),'output_bytes':len(result),'images':image_audit,'animations':[],'bounds_size':[round((hi[i]-lo[i])*scale,6)for i in range(3)],'floor':.02,'preserved_mesh_views_sha256':{str(i):sha(chunks[i][:g['bufferViews'][i]['byteLength']])for i in range(len(chunks))if i not in image_views}};report.write_text(json.dumps(audit,indent=2)+'\n');print(json.dumps(audit))
