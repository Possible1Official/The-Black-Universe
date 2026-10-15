"""Private Cyber Biker/Turbo Bike preparation. Never publish raw/GLB source directly.
Run Blender --background --disable-autoexec --python scripts/prepare-biker.py.
User confirmed creator redistribution rights; source provenance is not independently verified.
"""
import bpy,json,math,hashlib,struct,sys
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'.local/requested-optimized'; OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'.local/cg-props/cyber_girl.blend'
MIX=ROOT/'.local/mixamo-assets/f7b85d05-5f1c-47d8-9770-9a1a054bd6f6'

def bounds(objects):
 bpy.context.view_layer.update(); p=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
 return [min(v[i] for v in p) for i in range(3)],[max(v[i] for v in p) for i in range(3)]
def triangles(o):
 o.data.calc_loop_triangles();return len(o.data.loop_triangles)
def render(objects,name):
 for o in bpy.context.scene.objects:o.hide_render=o not in objects
 lo,hi=bounds([o for o in objects if o.type=='MESH']);center=Vector([(a+b)/2 for a,b in zip(lo,hi)]);size=max(b-a for a,b in zip(lo,hi))
 camera=bpy.data.objects.new('PreparationCamera',bpy.data.cameras.new('PreparationCamera'));bpy.context.collection.objects.link(camera)
 camera.location=center+Vector((size*1.7,size*(-2.0 if name.startswith('biker') else 2.0),size*.8));camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=size*1.35;bpy.context.scene.camera=camera
 for i,pos in enumerate([(size*2,size*2,size*3),(-size*2,-size,size*2)]):
  light=bpy.data.objects.new(f'PreparationLight{i}',bpy.data.lights.new(f'PreparationLight{i}','AREA'));bpy.context.collection.objects.link(light);light.location=center+Vector(pos);light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler();light.data.energy=900 if i==0 else 450;light.data.shape='DISK';light.data.size=size*2
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=False;scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.world.color=(.08,.08,.08);scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/name);bpy.ops.render.render(write_still=True)
 for o in list(bpy.data.objects):
  if o.name.startswith('Preparation'):bpy.data.objects.remove(o,do_unlink=True)
def normalize(objects,height=None,length=None,turn=0):
 lo,hi=bounds([o for o in objects if o.type=='MESH']);factor=height/(hi[2]-lo[2]) if height else length/(hi[1]-lo[1]);center=Vector(((lo[0]+hi[0])/2,(lo[1]+hi[1])/2,lo[2]))
 transform=Matrix.Rotation(turn,4,'Z')@Matrix.Scale(factor,4)@Matrix.Translation(-center)
 # Apply common world transform to top-level objects only, preserving skin hierarchies.
 selected=set(objects)
 for o in objects:
  if o.parent not in selected:o.matrix_world=transform@o.matrix_world
 bpy.context.view_layer.update()
def simplify(meshes,budget):
 source=sum(triangles(o) for o in meshes);ratio=min(1,budget/source)
 for o in meshes:
  # Decimation transfers retained source vertex weights and UVs.
  for m in list(o.modifiers):
   if m.type=='SUBSURF':o.modifiers.remove(m)
  if triangles(o)>100:
   bpy.context.view_layer.objects.active=o;m=o.modifiers.new('BoundedGameLOD','DECIMATE');m.ratio=ratio; bpy.ops.object.modifier_apply(modifier=m.name)
 return source,sum(triangles(o) for o in meshes)
def clean_materials(meshes):
 # Translate XNALara shader groups into lit glTF PBR explicitly. Their
 # shader defaults otherwise export skin/clothing as white emission.
 materials={m for o in meshes for m in o.data.materials if m};derived={}
 def image_copy(image,color):
  key=(image.name,color)
  if key in derived:return derived[key]
  cap=1024 if any(x in image.name.lower() for x in ['face','018_bc','hair']) else 512
  if max(image.size)>cap:
   w,h=image.size;image.scale(max(1,round(w*cap/max(w,h))),max(1,round(h*cap/max(w,h))))
  w,h=image.size;new=bpy.data.images.new('game_map_'+str(len(derived)),width=w,height=h,alpha=True)
  new.colorspace_settings.name='sRGB' if color else 'Non-Color';new.pixels.foreach_set(image.pixels[:]);new.update()
  new.filepath_raw=str(OUT/(new.name+'.png'));new.file_format='PNG';new.save();derived[key]=new;return new
 for index,m in enumerate(sorted(materials,key=lambda x:x.name)):
  oldname=m.name.lower();nodes=list(m.node_tree.nodes) if m.use_nodes else []
  textures=[n for n in nodes if n.type=='TEX_IMAGE' and n.image]
  diffuse=next((n for n in textures if any(l.from_node==n and l.to_socket.name=='Diffuse' for l in m.node_tree.links)),None)
  if diffuse is None:diffuse=next((n for n in textures if any(x in n.image.name.lower() for x in ['_diff','_alba','_d.tga','018_bc','nighttrain_a','nighttrain_b'])),None)
  if diffuse is None and textures:diffuse=textures[0]
  normal=next((n for n in textures if any(x in n.image.name.lower() for x in ['_nor','_n.tga','_nrm'])),None)
  rough=next((n for n in textures if 'rough' in n.image.name.lower()),None)
  alpha='hair' in oldname or 'eyelash' in oldname or 'wgtfaceparts' in oldname
  albedo=image_copy(diffuse.image,True) if diffuse else None;norm=image_copy(normal.image,False) if normal else None;roughness=image_copy(rough.image,False) if rough else None
  m.use_nodes=True;m.node_tree.nodes.clear();shader=m.node_tree.nodes.new('ShaderNodeBsdfPrincipled');out=m.node_tree.nodes.new('ShaderNodeOutputMaterial');m.node_tree.links.new(shader.outputs['BSDF'],out.inputs['Surface'])
  shader.inputs['Base Color'].default_value=(.12,.15,.17,1);shader.inputs['Metallic'].default_value=.35 if any(x in oldname for x in ['steel','metal']) else 0;shader.inputs['Roughness'].default_value=.65;shader.inputs['Emission Color'].default_value=(0,0,0,1);shader.inputs['Emission Strength'].default_value=0
  if albedo:
   tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=albedo;m.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
   if alpha:m.node_tree.links.new(tex.outputs['Alpha'],shader.inputs['Alpha'])
  if norm:
   tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=norm;nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.45;m.node_tree.links.new(tex.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],shader.inputs['Normal'])
  if roughness:
   tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=roughness;m.node_tree.links.new(tex.outputs['Color'],shader.inputs['Roughness'])
  m.name=('HairCutout_' if alpha else 'LitPBR_')+str(index);m.use_backface_culling=not alpha
  if alpha:m.surface_render_method='DITHERED'
 return len(materials),[list(i.size) for i in derived.values()]

def export(objects,path,animated=False):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.hide_set(False);o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_skins=animated,export_animations=animated,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_anim_slide_to_zero=True,export_def_bones=True,export_image_format='JPEG',export_jpeg_quality=90)

def character():
 bpy.ops.wm.open_mainfile(filepath=str(SOURCE));arm=bpy.data.objects['cyber girl'];meshes=[o for o in bpy.data.objects if o.type=='MESH' and o.parent==arm and 'pussy' not in o.name.lower() and 'pubes' not in o.name.lower()]
 # Clear the authored riding pose for a reusable standing bind rig.
 arm.animation_data_clear()
 for bone in arm.pose.bones:bone.matrix_basis=Matrix.Identity(4)
 arm.data.pose_position='REST';normalize([arm]+meshes,height=1.75,turn=math.pi*1.5);render([arm]+meshes,'biker-source.png')
 original,optimized=simplify(meshes,28500);material_count,maps=clean_materials(meshes);arm.data.pose_position='POSE';bpy.context.scene.render.fps=30
 clips=[]
 captured=['Idle','Walking']+[name for name in ['Running','Jump'] if (MIX/f'{name}_f7b85d05-5f1c-47d8-9770-9a1a054bd6f6.fbx').exists()]
 for name in captured:
  before=set(bpy.data.objects);bpy.ops.import_scene.fbx(filepath=str(MIX/f'{name}_f7b85d05-5f1c-47d8-9770-9a1a054bd6f6.fbx'));added=set(bpy.data.objects)-before;src=next(o for o in added if o.type=='ARMATURE');source_action=src.animation_data.action
  action=bpy.data.actions.new(name);action.use_fake_user=True;arm.animation_data_create();arm.animation_data.action=action
  first,last=[int(v) for v in source_action.frame_range]
  # Retarget global rest-relative rotations, then solve target parent-local basis.
  for frame in range(first,last+1):
   bpy.context.scene.frame_set(frame)
   solved={}
   for bone in arm.pose.bones:
    bone.rotation_mode='QUATERNION';sb=src.pose.bones.get(bone.name)
    rest=bone.bone.matrix_local.to_quaternion()
    # Both rigs have different rest arm angles and armature axes.
    # Match posed bone directions, rather than applying T-pose deltas to A-pose.
    conversion=arm.matrix_world.to_quaternion().inverted() @ src.matrix_world.to_quaternion()
    direction=conversion @ (sb.matrix.to_quaternion() @ Vector((0,1,0))) if sb else rest @ Vector((0,1,0))
    desired=(rest @ Vector((0,1,0))).rotation_difference(direction) @ rest
    parent=bone.parent
    relative_rest=parent.bone.matrix_local.to_quaternion().inverted() @ rest if parent else rest
    relative_pose=solved[parent.name].inverted() @ desired if parent else desired
    bone.rotation_quaternion=relative_rest.inverted() @ relative_pose;bone.location=(0,0,0);bone.scale=(1,1,1);solved[bone.name]=desired
    bone.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=bone.name)
  for o in added:bpy.data.objects.remove(o,do_unlink=True)
  arm.animation_data.action=None;track=arm.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True
  clips.append({'name':name,'type':'captured Mixamo motion, world-axis aligned bone-direction retarget','duration':float((last-first)/30)})
 # Distinct authored cyclic run: torso forward, coordinated bent-knee flight cycle.
 for name in [n for n in ['Running','Riding','Sitting','Jump'] if n not in captured]:
  action=bpy.data.actions.new(name);action.use_fake_user=True;arm.animation_data.action=action
  for frame in range(1,26):
   phase=(frame-1)/24*2*math.pi;directions={}
   for side,offset,sign in [('Left',0,1),('Right',math.pi,-1)]:
    swing=math.sin(phase+offset)
    directions.update({
     'mixamorig:'+side+'UpLeg':Vector((sign*.03,-.8,.65*swing)) if name=='Running' else Vector((sign*.10,-.12,.8)),
     'mixamorig:'+side+'Leg':Vector((0,-.7,-.65*max(0,-swing))) if name=='Running' else Vector((0,-.9,-.12)),
     'mixamorig:'+side+'Foot':Vector((0,-.1,.7)),
     'mixamorig:'+side+'Arm':Vector((sign*.12,-.7,-.4*swing)) if name=='Running' else Vector((sign*.10,-.85,.12)) if name=='Sitting' else Vector((sign*.2,-.45,.5)),
     'mixamorig:'+side+'ForeArm':Vector((sign*.03,.1,.7)) if name=='Running' else Vector((sign*.02,-.3,.65)) if name=='Sitting' else Vector((sign*.03,-.12,.7))})
   if name=='Jump':
    lift=math.sin((frame-1)/24*math.pi)
    for side,sign in [('Left',1),('Right',-1)]:
     directions.update({'mixamorig:'+side+'UpLeg':Vector((sign*.04,-.9+.55*lift,.65*lift)),'mixamorig:'+side+'Leg':Vector((0,-.9,-.6*lift)),'mixamorig:'+side+'Arm':Vector((sign*.15,-.9+.6*lift,.5*lift)),'mixamorig:'+side+'ForeArm':Vector((sign*.03,-.8+.4*lift,.5*lift))})
   solved={}
   for bone in arm.pose.bones:
    bone.rotation_mode='QUATERNION';rest=bone.bone.matrix_local.to_quaternion();parent=bone.parent
    relative_rest=parent.bone.matrix_local.to_quaternion().inverted() @ rest if parent else rest
    desired=solved[parent.name] @ relative_rest if parent else rest
    if bone.name in directions:
     direction=directions[bone.name].normalized();desired=(rest @ Vector((0,1,0))).rotation_difference(direction) @ rest
    if bone.name=='mixamorig:Spine':desired=Quaternion((1,0,0),.13 if name=='Running' else .1*lift if name=='Jump' else .08 if name=='Sitting' else .3) @ rest
    relative_pose=solved[parent.name].inverted() @ desired if parent else desired
    bone.rotation_quaternion=relative_rest.inverted() @ relative_pose;bone.location=(0,0,0);bone.scale=(1,1,1);solved[bone.name]=desired
    bone.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=bone.name)
  arm.animation_data.action=None;track=arm.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True
  clips.append({'name':name,'type':'locally authored procedural '+('run' if name=='Running' else 'jump cycle' if name=='Jump' else 'static seated pose'),'duration':.8})
 for b in arm.pose.bones:b.matrix_basis=Matrix.Identity(4)
 for t in arm.animation_data.nla_tracks:t.mute=False
 bpy.context.scene.frame_set(1);export([arm]+meshes,OUT/'biker.glb',True)
 # Hair cards need cutout depth writing and two visible sides in Three.js.
 path=OUT/'biker.glb';data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0];g=json.loads(data[20:20+length])
 for material in g['materials']:
  if material['name'].startswith('HairCutout_'):material.update({'alphaMode':'MASK','alphaCutoff':.35,'doubleSided':True})
 payload=json.dumps(g,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4);tail=data[20+length:];path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(payload)+len(tail))+struct.pack('<II',len(payload),0x4e4f534a)+payload+tail)

 # Isolate one captured track to inspect final skin deformation.
 for t in arm.animation_data.nla_tracks:t.mute=t.name!='Idle'
 bpy.context.scene.frame_set(20);render([arm]+meshes,'biker-optimized.png')
 for clip in ['Walking','Running','Riding','Jump']:
  for track in arm.animation_data.nla_tracks:track.mute=track.name!=clip
  bpy.context.scene.frame_set(8);render([arm]+meshes,f'biker-{clip.lower()}.png')
 return {'source_triangles':original,'triangles':optimized,'bones':len(arm.data.bones),'materials':material_count,'texture_sizes':maps,'clips':clips,'normalization':'1.75m rest height, floor0, +Z glTF forward','bytes':(OUT/'biker.glb').stat().st_size,'publication':'User-confirmed creator redistribution rights; not independently verified','source_evidence':['embedded original texture paths identify Resident Evil 3, Spiderman PS4, DOA5 and DW9/XNALara resources'],'retarget_limit':'World-axis aligned posed bone directions on matching Mixamo bones; no root translation or hip-height IK. Running/Jump use captured Mixamo FBXs when present; Riding/Sitting remain locally authored. Motion-only merge preserves reviewed geometry and textures.'}
def bike():
 bpy.ops.wm.open_mainfile(filepath=str(SOURCE));arm=bpy.data.objects['Armature.001'];meshes=[o for o in bpy.data.objects if o.type=='MESH' and (o.parent==arm or o.name.startswith('uploads_files_2776142_aircraft'))];objects=[arm]+meshes
 # Bake the assembled source transforms, omit weapon/character/helmet entirely.
 for o in meshes:
  bpy.context.view_layer.objects.active=o
  for m in list(o.modifiers):
   if m.type=='ARMATURE':bpy.ops.object.modifier_apply(modifier=m.name)
  world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
 normalize(meshes,length=2.5,turn=math.pi);render(meshes,'bike-source.png');original,optimized=simplify(meshes,23200);materials,maps=clean_materials(meshes)
 export(meshes,OUT/'bike.glb');render(meshes,'bike-optimized.png')
 return {'source_triangles':original,'triangles':optimized,'materials':materials,'texture_sizes':maps,'normalization':'2.5m length, floor0, -Z glTF forward','bytes':(OUT/'bike.glb').stat().st_size,'publication':'User-confirmed creator redistribution rights; not independently verified','source_evidence':['nighttrain_a/nighttrain_b textures under original XNALara bike path; no specific game title on bike maps. Attached aircraft turbine separately sourced by uploader.'],'rig':'static turbine-powered hover-style chassis; wheel-named meshes are steering parts, not road tires; no source motion clip exported'}
prior=json.loads((OUT/'biker-report.json').read_text()) if (OUT/'biker-report.json').exists() else {}
report={'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'character':character(),'bike':prior.get('bike') if '--character-only' in sys.argv else bike()};(OUT/'biker-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
