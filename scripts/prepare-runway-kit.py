"""Assemble the licensed alitoons straight kit; preserve original mesh/maps/door clip bytes."""
from pathlib import Path
import json,struct,hashlib
root=Path(__file__).resolve().parent.parent
source=root/'.local/requested-source/corridor-kit/SciFi_Corridor_Starter.glb'
archive=root/'.local/cg-props/Free_SciFi_Corridor_Starter_GLB.zip'
assert hashlib.sha256(archive.read_bytes()).hexdigest()=='ad260feedaaeb325c6246769238f6f0db125342166264827e9ceacffb0f9216d'
b=source.read_bytes();assert hashlib.sha256(b).hexdigest()=='0204881d802594cd23320bd927af5d7f2084bd4c3b3f20c672b5566b21ecb099'
n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);binary=b[28+n:]
assert [x['name'] for x in g['nodes']][:1]==['SM_SF_Corridor_Straight']
# Keep original node indices for the captured Door_Open animation. Scene 1 is
# a reusable library of the two leaves, not a standalone downloadable stock file.
nodes=g['nodes'];scene=[]
for i,z in enumerate([-10,-6,-2,2,6,10]):
 scene.append(len(nodes));nodes.append({'name':f'Erebus_Runway_Segment_{i}','mesh':0,'translation':[0,0,z],'scale':[11/3.5,5.4/3.4,1]})
leaf_root=len(nodes);nodes.append({'name':'Runway_Door_Source','translation':[-12,0,0],'children':[3,4]})
g['scenes']=[{'name':'Erebus_Sealed_Runway','nodes':scene},{'name':'Sliding_door_library','nodes':[leaf_root]}];g['scene']=0
# Export only straight and two leaves. Leave shared binary views untouched.
keep=[0,3,4];lookup={old:i for i,old in enumerate(keep)};g['meshes']=[g['meshes'][i] for i in keep]
for i,node in enumerate(nodes):
 if i in [1,2,5]:node.pop('mesh',None)
 elif 'mesh' in node:node['mesh']=lookup[node['mesh']]
j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);out=struct.pack('<III',0x46546c67,2,28+len(j)+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary
path=root/'.local/requested-optimized/corridor.glb';path.write_bytes(out)
report={'source_archive_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'source_glb_sha256':hashlib.sha256(b).hexdigest(),'glb_sha256':hashlib.sha256(out).hexdigest(),'source_triangles':2360,'instanced_straight_triangles':6*488,'door_leaf_triangles':2*180,'runtime_runway_and_two_doors_triangles':3648,'images':2,'texture_dimensions':[128,128],'clips':['Door_Open'],'source_mesh_material_texture_animation_buffers_preserved':True,'dimensions_gltf_xyz':[12.571428571,6.035294118,24],'interior_clearance':[11,5.4],'limitations':['Six source straight cells widened and raised for shuttle clearance; low-poly palette artwork, not photoreal scanned surfaces.','Original Door_Open clip reused for interlocked leaves; source corner/dead-end geometry is not rendered.','Separate game structural shell supplies bounded clean collision, not imported trim collision.']}
(root/'public/assets/requested/runway-kit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
