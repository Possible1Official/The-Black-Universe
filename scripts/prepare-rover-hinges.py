"""Repartition the reviewed game derivative without re-baking or changing source textures.
python scripts/prepare-rover-hinges.py <repo-root>
Private input: .local/requested-optimized/rover-before-hinges.glb
"""
import pathlib,sys,json,struct,copy,hashlib
import numpy as np
root=pathlib.Path(sys.argv[1]);out=root/'.local/requested-optimized';raw=(out/'rover-before-hinges.glb').read_bytes();sha=lambda b:hashlib.sha256(b).hexdigest();assert sha(raw)=='5c8757a715b1fd0bc52de9a919f41e86f783861b43c79ab090c88a19e438fcfc'
n=struct.unpack_from('<I',raw,12)[0];src=json.loads(raw[20:20+n]);binary=raw[28+n:];assert not src.get('animations')and not src.get('skins')
size_of={5126:4,5125:4,5123:2,5121:1};sizes={'VEC3':3,'VEC4':4,'VEC2':2,'SCALAR':1}
def rows(index):
 a=src['accessors'][index];v=src['bufferViews'][a['bufferView']];size=size_of[a['componentType']]*sizes[a['type']];start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',size);return [binary[start+i*stride:start+i*stride+size]for i in range(a['count'])]
def arr(index):
 a=src['accessors'][index];return np.frombuffer(b''.join(rows(index)),dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]).reshape(a['count'],sizes[a['type']])
p=src['meshes'][0]['primitives'][0];pos=arr(p['attributes']['POSITION'])+np.array(src['nodes'][0]['translation']);faces=arr(p['indices']).reshape(-1,3);parent=list(range(len(pos)));lookup={}
def find(i):
 while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
 return i
def union(a,b):parent[find(a)]=find(b)
for i,v in enumerate(pos):
 key=tuple(np.round(v,5))
 if key in lookup:union(i,lookup[key])
 else:lookup[key]=i
for a,b,c in faces:union(int(a),int(b));union(int(b),int(c))
groups={}
for i,f in enumerate(faces):groups.setdefault(find(int(f[0])),[]).append(i)
components=list(groups.values());assert len(components)==177
parts={'FrontRight':{'wheel':1,'arm':[6,9,10,11,52,53,62,155,157,158],'hip':[-.398,1.05,-.515],'node':1},'FrontLeft':{'wheel':104,'arm':[105,106,107,108,109,110,111,156,159,176],'hip':[.398,1.05,-.515],'node':4},'RearRight':{'wheel':2,'arm':[12,168],'hip':[-.264,.94,.645],'node':2},'RearLeft':{'wheel':3,'arm':[13,169],'hip':[.264,.94,.645],'node':3}}
used=set()
for part in parts.values():
 part['rim_faces']=components[part['wheel']];part['arm_faces']=[f for i in part['arm']for f in components[i]];used.update(part['rim_faces']);used.update(part['arm_faces'])
g={k:copy.deepcopy(src[k])for k in ['asset','materials','textures','images','samplers']if k in src};g.update(scene=0,scenes=[{'nodes':[]}],nodes=[],meshes=[],accessors=[],bufferViews=[],buffers=[{'byteLength':0}]);chunks=[];offset=0

def view(data,target=None):
 global offset
 v={'buffer':0,'byteOffset':offset,'byteLength':len(data)}
 if target:v['target']=target
 g['bufferViews'].append(v);chunks.append(data+b'\0'*((-len(data))%4));offset+=len(chunks[-1]);return len(g['bufferViews'])-1
image_hashes=[]
for image in g['images']:
 v=src['bufferViews'][image['bufferView']];data=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];image_hashes.append(sha(data));image['bufferView']=view(data)
source_signatures=[];output_signatures=[]
def signatures(primitive,ids):
 attrs={k:rows(a)for k,a in sorted(primitive['attributes'].items())};return [sha(bytes([primitive['material']])+b''.join(b''.join(a[int(i)]for a in attrs.values())for i in face))for face in ids]
for mesh in src['meshes']:
 for primitive in mesh['primitives']:source_signatures.extend(signatures(primitive,arr(primitive['indices']).reshape(-1,3)))
def primitive(source,face_ids=None):
 ids=arr(source['indices']).reshape(-1,3)
 if face_ids is not None:ids=ids[face_ids]
 output_signatures.extend(signatures(source,ids));unique=sorted(set(int(i)for i in ids.flatten()));mapping={old:new for new,old in enumerate(unique)};result={'attributes':{},'material':source['material']}
 for key,index in source['attributes'].items():
  a=copy.deepcopy(src['accessors'][index]);r=rows(index);data=b''.join(r[i]for i in unique);a.pop('byteOffset',None);a['count']=len(unique);a['bufferView']=view(data,34962)
  if key=='POSITION':points=arr(index)[unique];a['min']=points.min(axis=0).tolist();a['max']=points.max(axis=0).tolist()
  g['accessors'].append(a);result['attributes'][key]=len(g['accessors'])-1
 flat=np.array([mapping[int(i)]for i in ids.flatten()],dtype='<u2');g['accessors'].append({'bufferView':view(flat.tobytes(),34963),'componentType':5123,'count':len(flat),'type':'SCALAR'});result['indices']=len(g['accessors'])-1;return result

def mesh_node(name,primitives,translation):
 mi=len(g['meshes']);g['meshes'].append({'name':name,'primitives':primitives});ni=len(g['nodes']);g['nodes'].append({'name':name,'mesh':mi,'translation':list(translation)});return ni
T=np.array(src['nodes'][0]['translation']);body=mesh_node('Rover_Chassis',[primitive(p,[i for i in range(len(faces))if i not in used]),primitive(src['meshes'][0]['primitives'][1])],T);g['scenes'][0]['nodes'].append(body)
for name,part in parts.items():
 tire_node=src['nodes'][part['node']];center=np.array(tire_node['translation']);hip=np.array(part['hip']);arm=mesh_node('Rover_Arm_'+name,[primitive(p,part['arm_faces'])],T-hip);rim=mesh_node('Rover_Rim_'+name,[primitive(p,part['rim_faces'])],T-center)
 tire=mesh_node('Rover_Tire_'+name,[primitive(src['meshes'][tire_node['mesh']]['primitives'][0])],[0,0,0]);wheel=len(g['nodes']);ankle_x=(.398 if name.startswith('Front')else .42)*(1 if name.endswith('Left')else -1);wheel_offset=float(center[0]-ankle_x);g['nodes'].append({'name':'Rover_Wheel_'+name,'translation':[wheel_offset,0,0],'children':[rim,tire]});knuckle=len(g['nodes']);g['nodes'].append({'name':'Rover_Knuckle_'+name,'translation':[-wheel_offset,0,0],'children':[wheel]});hub=len(g['nodes']);g['nodes'].append({'name':'Rover_Hub_'+name,'translation':list(center-hip),'children':[knuckle]});leg=len(g['nodes']);g['nodes'].append({'name':'Rover_Leg_'+name,'translation':list(hip),'children':[arm,hub]});g['scenes'][0]['nodes'].append(leg)
assert sorted(source_signatures)==sorted(output_signatures),'Every triangle and its material/vertex attributes must survive exactly once'
assert offset==sum(len(c)for c in chunks);assert all(isinstance(v['byteOffset'],int)and v['byteOffset']%4==0 and v['byteOffset']+v['byteLength']<=offset for v in g['bufferViews']);g['buffers'][0]['byteLength']=offset;j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);body=b''.join(chunks);glb=struct.pack('<III',0x46546c67,2,28+len(j)+len(body))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(body),0x004e4942)+body;(out/'rover.glb').write_bytes(glb)
report={'input_derivative_sha256':sha(raw),'output_sha256':sha(glb),'output_bytes':len(glb),'triangles':sum(src['accessors'][p['indices']]['count']//3 for m in src['meshes']for p in m['primitives']),'primitives':sum(len(m['primitives'])for m in g['meshes']),'image_sha256':image_hashes,'triangle_attribute_multiset_sha256':sha(''.join(sorted(output_signatures)).encode()),'triangle_data_preserved':True,'hips':{k:v['hip']for k,v in parts.items()},'parts':{k:{'rim_triangles':len(v['rim_faces']),'arm_triangles':len(v['arm_faces'])}for k,v in parts.items()},'animations':[]}
(root/'public/assets/requested/rover-hinges.json').write_text(json.dumps(report,indent=2)+'\n');old=json.loads((out/'rover-report.json').read_text());old['derivative_sha256']=sha(glb);old['bytes']=len(glb);old['hinge_conversion']=report;old['limits']=[s for s in old['limits']if not s.startswith('No suspension rig')and not s.startswith('Four source arms')];old['limits'].append('Four source arms and complete metal/rubber wheels have runtime hinge carriers; bounded kinematic articulation, not force-based suspension.');(out/'rover-report.json').write_text(json.dumps(old,indent=2)+'\n');print(json.dumps(report))
