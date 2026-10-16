"""Prepare the reviewed CGTrader drone; bake its original mirrored rotor motion.
Raw Blender scene remains private. Exclude staging/camera/world flight animation.
"""
import bpy,math,json,hashlib,struct
from pathlib import Path
from mathutils import Matrix,Vector
ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'.local/cg-props/drone-animation.blend'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()=='4c5e38c758880dfa0d3b0d6e3129da0029810bea96bcf959e76ac4139e15ec66'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE),load_ui=False,use_scripts=False)
scene=bpy.context.scene;source_fps=scene.render.fps;scene.frame_set(0)
body=bpy.data.objects['Plane'];rotors=[bpy.data.objects[n] for n in ['Circle','Circle.001']]
assert all(any(m.type=='MIRROR' and list(m.use_axis)==[True,True,False] and m.mirror_object==body for m in o.modifiers)for o in rotors)
assert all(any(m.type=='GENERATOR' and list(m.coefficients)==[0,2]for c in o.animation_data.action.fcurves for m in c.modifiers)for o in rotors)
# The mirror modifier otherwise bakes every blade into a rotating aggregate.
# Evaluate each blade without its mirror, then keep four independent rotor hubs.
for o in rotors:
 for m in o.modifiers:
  if m.type=='MIRROR':m.show_viewport=m.show_render=False
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();inverse=body.matrix_world.inverted()
source_visibility={o.name:o.hide_render for o in bpy.data.objects}
def evaluated(o,name):
 mesh=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps)
 obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj);mesh.transform(inverse@o.matrix_world);return obj
static=[]
for name in ['Plane','Cylinder','Cylinder.001','Cylinder.002','Circle.002']:
 o=bpy.data.objects[name]
 if not o.hide_render:static.append(evaluated(o,'ECHO_'+name.replace('.','_')))
assert static
pivot=(inverse@rotors[0].matrix_world).translation
blades=[evaluated(o,'Blade_'+str(i))for i,o in enumerate(rotors)]
bpy.ops.object.select_all(action='DESELECT')
for o in blades:o.select_set(True)
bpy.context.view_layer.objects.active=blades[0];bpy.ops.object.join();blade=blades[0];blade.data.transform(Matrix.Translation(-pivot));blade.name='ECHO_Rotor_0'
# Reuse one pair of original blade geometries at four mirrored source positions.
animated=[]
for i,(sx,sy)in enumerate([(1,1),(-1,1),(1,-1),(-1,-1)]):
 o=blade if i==0 else bpy.data.objects.new('ECHO_Rotor_'+str(i),blade.data)
 if i:scene.collection.objects.link(o)
 o.location=Vector((pivot.x*sx,pivot.y*sy,pivot.z));o.scale=(sx,sy,1);o.rotation_mode='QUATERNION'
 for n in range(17):
  o.rotation_quaternion=(Matrix.Rotation(sx*sy*2*math.pi*n/16,4,'Z')).to_quaternion();o.keyframe_insert(data_path='rotation_quaternion',frame=n+1)
 action=o.animation_data.action;action.name='Rotor_'+str(i)+'_source_generator'
 for curve in action.fcurves:
  for key in curve.keyframe_points:key.interpolation='LINEAR'
 o.animation_data.action=None;track=o.animation_data.nla_tracks.new();track.name='RotorLoop';track.strips.new('RotorLoop',1,action)
 animated.append(o)
objects=static+animated
# Bound the entire rotor cycle, not only the initial blade angle.
points=[]
for n in range(17):
 scene.frame_set(n+1);bpy.context.view_layer.update()
 for o in objects:points.extend(o.matrix_world@Vector(v)for v in o.bound_box)
lo=Vector([min(p[i]for p in points)for i in range(3)]);hi=Vector([max(p[i]for p in points)for i in range(3)])
scale=.75/max((hi-lo).x,(hi-lo).y,(hi-lo).z);center=(lo+hi)*.5
normalized=bpy.data.objects.new('ECHO_game_fit',None);scene.collection.objects.link(normalized);normalized.scale=(scale,)*3;normalized.location=-center*scale
for o in objects:o.parent=normalized
scene.frame_start=1;scene.frame_end=17;scene.render.fps=source_fps;scene.render.fps_base=1
bpy.ops.object.select_all(action='DESELECT')
for o in objects+[normalized]:o.select_set(True)
bpy.context.view_layer.objects.active=static[0];scene.frame_set(1)
output=ROOT/'.local/requested-optimized/drone.glb';output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_anim_slide_to_zero=True)
raw=output.read_bytes();json_size=int.from_bytes(raw[12:16],'little');g=json.loads(raw[20:20+json_size]);binary=bytearray(raw[28+json_size:])
# Export at ordinary FPS, then use the source generator's exact cycle duration.
# Four channels share one input accessor; modify each timeline only once.
for index in {s['input']for a in g['animations']for s in a['samplers']}:
 a=g['accessors'][index];view=g['bufferViews'][a['bufferView']];offset=view.get('byteOffset',0)+a.get('byteOffset',0)
 values=struct.unpack_from('<'+'f'*a['count'],binary,offset);values=[v*math.pi/16 for v in values];struct.pack_into('<'+'f'*len(values),binary,offset,*values);a['min']=[min(values)];a['max']=[max(values)]
j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);raw=struct.pack('<III',0x46546c67,2,28+len(j)+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary;output.write_bytes(raw)
triangles=sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes']for p in m['primitives'])
report={'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'source_creator':'RiDDDick1991','model_id':4439273,'glb_sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'unique_geometry_triangles':triangles,'runtime_mesh_instances':len(objects),'source_images':0,'images':len(g.get('images',[])),'clips':[a['name']for a in g.get('animations',[])],'source_rotor_radians_per_frame':2,'source_fps':source_fps,'loop_seconds':math.pi/source_fps,'normalized_cycle_bounds':[list((lo-center)*scale),list((hi-center)*scale)],'excluded':['staging floor','metaball clouds','source lights/camera','spatial flight/noise animation'],'limitations':['Source uses plain Principled materials and has no image textures.','Source mirrored procedural rotor motion baked to four independent rigid hubs.','No source spatial flight or camera animation; game motion supplies navigation.','Loop sampling retains original generator angular speed; motion blur is not implemented.']}
(ROOT/'.local/requested-optimized/drone-report.json').write_text(json.dumps(report,indent=2)+'\n')
(ROOT/'public/assets/requested/drone-conversion.json').write_text(json.dumps(report,indent=2)+'\n')
print('DRONE_REPORT '+json.dumps(report))
