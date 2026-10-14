"""Private Cyber Biker/Turbo Bike preparation. Never publish raw/GLB source directly.
Run Blender --background --disable-autoexec --python scripts/prepare-biker.py.
User confirmed creator redistribution rights; source provenance is not independently verified.
"""
import bpy,json,math,hashlib
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
 materials={m for o in meshes for m in o.data.materials if m}
 images={n.image for m in materials if m.use_nodes for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image}
 derived=[]
 for i,image in enumerate(sorted(images,key=lambda x:x.name)):
  limit=1024 if 'face' in image.name.lower() or 'nighttrain' in image.name.lower() else 512
  if max(image.size)>limit:image.scale(max(1,round(image.size[0]*limit/max(image.size))),max(1,round(image.size[1]*limit/max(image.size))))
  path=OUT/f'biker-map-{i:02d}.png';image.save_render(str(path));new=bpy.data.images.load(str(path),check_existing=False);new.name=f'game_map_{i:02d}';new.colorspace_settings.name=image.colorspace_settings.name;derived.append(new)
  for m in materials:
   if m.use_nodes:
    for node in m.node_tree.nodes:
     if node.type=='TEX_IMAGE' and node.image==image:node.image=new
 for i,m in enumerate(sorted(materials,key=lambda x:x.name)):m.name=f'GamePBR_{i:02d}';m.use_backface_culling=True
 return len(materials),[list(i.size) for i in derived]

def export(objects,path,animated=False):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.hide_set(False);o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_skins=animated,export_animations=animated,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_anim_slide_to_zero=True,export_def_bones=True,export_image_format='JPEG',export_jpeg_quality=85)

def character():
 bpy.ops.wm.open_mainfile(filepath=str(SOURCE));arm=bpy.data.objects['cyber girl'];meshes=[o for o in bpy.data.objects if o.type=='MESH' and o.parent==arm and 'pussy' not in o.name.lower() and 'pubes' not in o.name.lower()]
 # Clear the authored riding pose for a reusable standing bind rig.
 arm.animation_data_clear()
 for bone in arm.pose.bones:bone.matrix_basis=Matrix.Identity(4)
 arm.data.pose_position='REST';normalize([arm]+meshes,height=1.75,turn=math.pi*1.5);render([arm]+meshes,'biker-source.png')
 original,optimized=simplify(meshes,28500);material_count,maps=clean_materials(meshes);arm.data.pose_position='POSE';bpy.context.scene.render.fps=30
 clips=[]
 for name in ['Idle','Walking']:
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
    desired=(sb.matrix.to_quaternion() @ sb.bone.matrix_local.to_quaternion().inverted()) @ rest if sb else rest
    parent=bone.parent
    relative_rest=parent.bone.matrix_local.to_quaternion().inverted() @ rest if parent else rest
    relative_pose=solved[parent.name].inverted() @ desired if parent else desired
    bone.rotation_quaternion=relative_rest.inverted() @ relative_pose;bone.location=(0,0,0);bone.scale=(1,1,1);solved[bone.name]=desired
    bone.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=bone.name)
  for o in added:bpy.data.objects.remove(o,do_unlink=True)
  arm.animation_data.action=None;track=arm.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True
  clips.append({'name':name,'type':'captured Mixamo motion, global rest-relative rotation retarget','duration':float((last-first)/30)})
 # Distinct authored cyclic run: torso forward, coordinated bent-knee flight cycle.
 for name in ['Running','Riding']:
  action=bpy.data.actions.new(name);action.use_fake_user=True;arm.animation_data.action=action
  for frame in range(1,26):
   phase=(frame-1)/24*2*math.pi;directions={}
   for side,offset,sign in [('Left',0,1),('Right',math.pi,-1)]:
    swing=math.sin(phase+offset)
    directions.update({
     'mixamorig:'+side+'UpLeg':Vector((sign*.03,-.8,.65*swing)) if name=='Running' else Vector((sign*.10,-.12,.8)),
     'mixamorig:'+side+'Leg':Vector((0,-.7,-.65*max(0,-swing))) if name=='Running' else Vector((0,-.9,-.12)),
     'mixamorig:'+side+'Foot':Vector((0,-.1,.7)),
     'mixamorig:'+side+'Arm':Vector((sign*.12,-.7,-.4*swing)) if name=='Running' else Vector((sign*.2,-.45,.5)),
     'mixamorig:'+side+'ForeArm':Vector((sign*.03,.1,.7)) if name=='Running' else Vector((sign*.03,-.12,.7))})
   solved={}
   for bone in arm.pose.bones:
    bone.rotation_mode='QUATERNION';rest=bone.bone.matrix_local.to_quaternion();parent=bone.parent
    relative_rest=parent.bone.matrix_local.to_quaternion().inverted() @ rest if parent else rest
    desired=solved[parent.name] @ relative_rest if parent else rest
    if bone.name in directions:
     direction=directions[bone.name].normalized();desired=(rest @ Vector((0,1,0))).rotation_difference(direction) @ rest
    if bone.name=='mixamorig:Spine':desired=Quaternion((1,0,0),.13 if name=='Running' else .3) @ rest
    relative_pose=solved[parent.name].inverted() @ desired if parent else desired
    bone.rotation_quaternion=relative_rest.inverted() @ relative_pose;bone.location=(0,0,0);bone.scale=(1,1,1);solved[bone.name]=desired
    bone.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=bone.name)
  arm.animation_data.action=None;track=arm.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True
  clips.append({'name':name,'type':'locally authored procedural '+('run' if name=='Running' else 'static seated pose'),'duration':.8})
 for b in arm.pose.bones:b.matrix_basis=Matrix.Identity(4)
 for t in arm.animation_data.nla_tracks:t.mute=False
 bpy.context.scene.frame_set(1);export([arm]+meshes,OUT/'biker.glb',True)
 # Isolate one captured track to inspect final skin deformation.
 for t in arm.animation_data.nla_tracks:t.mute=t.name!='Idle'
 bpy.context.scene.frame_set(20);render([arm]+meshes,'biker-optimized.png')
 for clip in ['Walking','Running','Riding']:
  for track in arm.animation_data.nla_tracks:track.mute=track.name!=clip
  bpy.context.scene.frame_set(8);render([arm]+meshes,f'biker-{clip.lower()}.png')
 return {'source_triangles':original,'triangles':optimized,'bones':len(arm.data.bones),'materials':material_count,'texture_sizes':maps,'clips':clips,'normalization':'1.75m rest height, floor0, +Z glTF forward','bytes':(OUT/'biker.glb').stat().st_size,'publication':'User-confirmed creator redistribution rights; not independently verified','source_evidence':['embedded original texture paths identify Resident Evil 3, Spiderman PS4, DOA5 and DW9/XNALara resources'],'retarget_limit':'Global rest-relative quaternion rotations on matching Mixamo bones; no root translation or hip-height IK. Procedural run/riding are locally authored, not captured Mixamo running.'}
def bike():
 bpy.ops.wm.open_mainfile(filepath=str(SOURCE));arm=bpy.data.objects['Armature.001'];meshes=[o for o in bpy.data.objects if o.type=='MESH' and (o.parent==arm or o.name.startswith('uploads_files_2776142_aircraft'))];objects=[arm]+meshes
 # Bake the assembled source transforms, omit weapon/character/helmet entirely.
 for o in meshes:
  bpy.context.view_layer.objects.active=o
  for m in list(o.modifiers):
   if m.type=='ARMATURE':bpy.ops.object.modifier_apply(modifier=m.name)
  world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
 normalize(meshes,length=3.6,turn=math.pi);render(meshes,'bike-source.png');original,optimized=simplify(meshes,23200);materials,maps=clean_materials(meshes)
 export(meshes,OUT/'bike.glb');render(meshes,'bike-optimized.png')
 return {'source_triangles':original,'triangles':optimized,'materials':materials,'texture_sizes':maps,'normalization':'3.6m length, floor0, -Z glTF forward','bytes':(OUT/'bike.glb').stat().st_size,'publication':'User-confirmed creator redistribution rights; not independently verified','source_evidence':['nighttrain_a/nighttrain_b textures under original XNALara bike path; no specific game title on bike maps. Attached aircraft turbine separately sourced by uploader.'],'rig':'static baked chassis; wheel rotation not retained'}
report={'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'character':character(),'bike':bike()};(OUT/'biker-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
