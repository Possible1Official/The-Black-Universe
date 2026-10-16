"""Select two reviewed grass clumps, preserving mesh data and preparing cutout maps.
python scripts/prepare-grass.py <repo-root>; raw CGTrader sources stay ignored.
"""
import sys,pathlib,struct,json,hashlib,io,copy
import numpy as np
from PIL import Image
root=pathlib.Path(sys.argv[1]);source=root/'.local/cg-props/plant-Grass_For_Games.glb';blend=root/'.local/cg-props/plant-Grass_For_Games.blend';out=root/'.local/requested-optimized';out.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest();raw=source.read_bytes();assert sha(raw)=='884af32b1cbb3fa0e85f27df67c97ed57629ebda8aee95f263ca2697e9b04da3';assert sha(blend.read_bytes())=='b8490ebbe4a442ab6d2b5d3b7bf75ef4204df0e2a0f1c4bc64d116de80123826'
n=struct.unpack_from('<I',raw,12)[0];src=json.loads(raw[20:20+n]);binary=raw[28+n:];assert not src.get('animations')and not src.get('skins')
g={'asset':{'version':'2.0','generator':'Erebus reviewed grass derivative'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'materials':[],'textures':[],'images':[],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],'accessors':[],'bufferViews':[],'buffers':[{'byteLength':0}]};chunks=[];offset=0;mesh_hashes={};image_audit=[];bounds=[]
def add_view(data,extra=None):
 global offset
 v={'buffer':0,'byteOffset':offset,'byteLength':len(data),**(extra or{})};idx=len(g['bufferViews']);g['bufferViews'].append(v);padded=data+b'\0'*((-len(data))%4);chunks.append(padded);offset+=len(padded);return idx
def accessor(index):
 a=copy.deepcopy(src['accessors'][index]);v=src['bufferViews'][a['bufferView']];data=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];mesh_hashes[str(a['bufferView'])]=sha(data)
 a['bufferView']=add_view(data,{k:v[k]for k in ['target','byteStride']if k in v});g['accessors'].append(a);return len(g['accessors'])-1
for node_id in [0,5]:
 node=copy.deepcopy(src['nodes'][node_id]);mesh=copy.deepcopy(src['meshes'][node['mesh']]);assert len(mesh['primitives'])==1;p=mesh['primitives'][0];material=copy.deepcopy(src['materials'][p['material']]);material['alphaMode']='MASK';material['alphaCutoff']=.35;material['doubleSided']=True
 for reference,is_normal in [(material['pbrMetallicRoughness']['baseColorTexture'],False),(material['normalTexture'],True)]:
  image_id=src['textures'][reference['index']]['source'];iv=src['bufferViews'][src['images'][image_id]['bufferView']];data=binary[iv.get('byteOffset',0):iv.get('byteOffset',0)+iv['byteLength']];im=Image.open(io.BytesIO(data)).convert('RGB'if is_normal else'RGBA');original=im.size
  coverage=float((np.asarray(im)[:,:,3]>=.35*255).mean())if not is_normal else None;im=im.resize((512,512),Image.Resampling.LANCZOS)
  if is_normal:
   xyz=np.asarray(im,dtype=np.float32)/127.5-1;xyz/=np.maximum(np.linalg.norm(xyz,axis=2,keepdims=True),1e-8);im=Image.fromarray(np.clip((xyz+1)*127.5,0,255).round().astype(np.uint8))
  else:
   pixels=np.array(im);alpha=pixels[:,:,3].astype(np.float32);lo,hi=.5,2
   for _ in range(20):
    factor=(lo+hi)/2
    if (alpha*factor>=.35*255).mean()<coverage:lo=factor
    else:hi=factor
   pixels[:,:,3]=np.clip(alpha*(lo+hi)/2,0,255).round().astype(np.uint8);im=Image.fromarray(pixels)
  buf=io.BytesIO();im.save(buf,format='PNG',optimize=True);converted=buf.getvalue();ii=len(g['images']);g['images'].append({'name':src['images'][image_id].get('name'),'mimeType':'image/png','bufferView':add_view(converted)});ti=len(g['textures']);g['textures'].append({'source':ii,'sampler':0});reference['index']=ti
  image_audit.append({'name':g['images'][-1]['name'],'source_sha256':sha(data),'output_sha256':sha(converted),'source_size':original,'size':[512,512],'normal_renormalized':is_normal,'source_alpha_coverage':coverage,'output_alpha_coverage':float((np.asarray(im)[:,:,3]>=.35*255).mean())if not is_normal else None})
 p['material']=len(g['materials']);g['materials'].append(material)
 a=src['accessors'][p['attributes']['POSITION']];v=src['bufferViews'][a['bufferView']];start=v.get('byteOffset',0)+a.get('byteOffset',0);positions=np.array([struct.unpack_from('<fff',binary,start+i*v.get('byteStride',12))for i in range(a['count'])])
 q=node.get('rotation',[0,0,0,1]);x,y,z,w=q;rotation=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
 positions=(positions*np.array(node.get('scale',[1,1,1])))@rotation.T+np.array(node.get('translation',[0,0,0]));low=positions.min(axis=0);high=positions.max(axis=0);size=high-low;scale=min(.65/size[1],.8/max(size[0],size[2]));translation=[-(low[0]+high[0])*.5*scale,-low[1]*scale,-(low[2]+high[2])*.5*scale]
 p['indices']=accessor(p['indices']);p['attributes']={k:accessor(a)for k,a in p['attributes'].items()};node['mesh']=len(g['meshes']);g['meshes'].append(mesh);ni=len(g['nodes']);g['nodes'].append(node);g['nodes'].append({'name':'Grounded_'+node['name'],'children':[ni],'scale':[scale]*3,'translation':translation});g['scenes'][0]['nodes'].append(ni+1);bounds.append({'name':node['name'],'size':list(size*scale),'floor':0,'scale':scale})
g['buffers'][0]['byteLength']=offset;j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);body=b''.join(chunks);glb=struct.pack('<III',0x46546c67,2,28+len(j)+len(body))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(body),0x004e4942)+body;(out/'grass.glb').write_bytes(glb)
report={'source_sha256':sha(raw),'source_blend_sha256':sha(blend.read_bytes()),'source_bytes':len(raw),'output_bytes':len(glb),'selected_source_nodes':[0,5],'triangles':[40,40],'bounds':bounds,'animations':[],'source_actions':[],'alpha_fix':'Source Blend uses transparent/mixed leaf shaders; supplied GLB omitted alphaMode. Restore MASK .35, double-sided. Preserve base RGBA and cutoff coverage after filtering. No emission.','images':image_audit,'preserved_mesh_views_sha256':mesh_hashes}
(out/'grass-report.json').write_text(json.dumps(report,indent=2)+'\n');(root/'public/assets/requested/grass-conversion.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
