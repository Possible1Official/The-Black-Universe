"""Bounded offline rover conversion. Inputs/outputs stay ignored and private.
Blender --background --disable-autoexec -t 2 --python scripts/prepare-rover.py
"""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'.local/requested-optimized';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'.local/cg-props/Sci-FI_Rover.blend'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE),load_ui=False,use_scripts=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=4;scene.cycles.use_denoising=False;scene.cycles.device='CPU';scene.render.use_persistent_data=True

def bounds(objects):
 bpy.context.view_layer.update();points=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
 return Vector([min(v[i] for v in points) for i in range(3)]),Vector([max(v[i] for v in points) for i in range(3)])
def vertex_bounds(objects):
 bpy.context.view_layer.update();points=[o.matrix_world@v.co for o in objects for v in o.data.vertices]
 return Vector([min(v[i] for v in points) for i in range(3)]),Vector([max(v[i] for v in points) for i in range(3)])
def triangles(o):o.data.calc_loop_triangles();return len(o.data.loop_triangles)
def render(objects,name):
 for o in scene.objects:o.hide_render=o not in objects
 lo,hi=bounds(objects);center=(lo+hi)/2;size=max(hi-lo)
 cam=bpy.data.objects.new('PreparationCamera',bpy.data.cameras.new('PreparationCamera'));scene.collection.objects.link(cam);cam.location=center+Vector((size*1.5,size*1.8 if 'optimized' in name else -size*1.8,size*.9));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=size*1.25;scene.camera=cam
 for n,offset,energy in [('Key',(1,-1,2),1000),('Fill',(-1,0,1),650)]:
  light=bpy.data.objects.new('Preparation'+n,bpy.data.lights.new('Preparation'+n,'AREA'));scene.collection.objects.link(light);light.location=center+Vector(offset)*size;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler();light.data.energy=energy;light.data.size=size*1.8
 scene.world=bpy.data.worlds.new('PreparationWorld');scene.world.use_nodes=True;scene.render.use_compositing=False;scene.render.film_transparent=False;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.14,.17,.21,1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.5
 scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.cycles.samples=8;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/name);bpy.ops.render.render(write_still=True)
 for o in list(bpy.data.objects):
  if o.name.startswith('Preparation'):bpy.data.objects.remove(o,do_unlink=True)

# Evaluate modifiers before omitting invisible modeling cutters and cameras.
sources=[o for o in scene.objects if o.type=='MESH' and not o.hide_render and not o.hide_get()]
render(sources,'rover-source.png')
bpy.ops.object.select_all(action='DESELECT')
deps=bpy.context.evaluated_depsgraph_get();objects=[];empty_evaluated=[]
for src in sources:
 evaluated=src.evaluated_get(deps);mesh=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=deps)
 if not mesh.polygons:empty_evaluated.append(src.name);continue
 o=bpy.data.objects.new('Rover_'+src.name,mesh);scene.collection.objects.link(o);o.matrix_world=src.matrix_world.copy();objects.append(o)
for src in sources:src.hide_render=True;src.hide_set(True)
source_triangles=sum(triangles(o) for o in objects)
# Source -Y nose becomes +Y Blender / -Z glTF. Width is separately bounded.
lo,hi=bounds(objects);size=hi-lo;factor=3.6/size.y;xs=min(factor,2.1/size.x);center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z));transform=Matrix.Rotation(math.pi,4,'Z')@Matrix.Diagonal((xs,factor,factor,1))@Matrix.Translation(-center)
for o in objects:o.matrix_world=transform@o.matrix_world
# Shared source UVs retain decal placement while static chassis batching bounds
# offline shader-bake synchronization. Fine generated/object-coordinate noise
# can change under this consolidation and is documented as approximate.
for o in objects:
 original=o.data.uv_layers.active
 if original:
  uv=o.data.uv_layers.new(name='SharedSourceUV')
  for src,dst in zip(original.data,uv.data):dst.uv=src.uv
  uv.active_render=True
bpy.ops.object.select_all(action='DESELECT')
for o in objects:
 if 'Plate' in o.name:
  group=o.vertex_groups.new(name='RoverTire');group.add(list(range(len(o.data.vertices))),1,'REPLACE')
 o.select_set(True)
bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();body=bpy.context.view_layer.objects.active;body.name='Rover_PreparedAssembly'
objects=[body]
# Bake compatible roughness and supported emission to bounded 1024 atlases.
# Creator shader base color/decal graph is replaced by portable gray PBR.
for o in objects:
 bpy.context.view_layer.objects.active=o;o.select_set(True);o.hide_set(False)
 # Original UV layer remains available to source decal shaders.
 original=o.data.uv_layers.active
 if original:original.active_render=True
 o.data.uv_layers.new(name='GameAtlas');o.data.uv_layers.active_index=len(o.data.uv_layers)-1
bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(65),island_margin=.004,area_weight=.5);bpy.ops.object.mode_set(mode='OBJECT')
materials={m for o in objects for m in o.data.materials if m and m.use_nodes}
maps={}
scene.cycles.samples=2;scene.render.bake.margin=3;scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True
for name,kind in [('roughness','ROUGHNESS'),('emission','EMIT')]:
 image=bpy.data.images.new('RoverAtlas_'+name,width=1024,height=1024,alpha=False)
 if name=='roughness':image.colorspace_settings.name='Non-Color'
 for m in materials:
  node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;m.node_tree.nodes.active=node
 bpy.ops.object.bake(type=kind,uv_layer='GameAtlas',use_clear=False);image.filepath_raw=str(OUT/f'rover-{name}.png');image.file_format='PNG';image.save();maps[name]=image
 for m in materials:
  for node in list(m.node_tree.nodes):
   if node.type=='TEX_IMAGE' and node.image==image:m.node_tree.nodes.remove(node)
# Portable gray hull, dark rubber and glass retain a bounded metallic response.
pbr=bpy.data.materials.new('Rover_BakedPBR');pbr.use_nodes=True;pbr.use_backface_culling=True
shader=pbr.node_tree.nodes.get('Principled BSDF');shader.inputs['Metallic'].default_value=.58
shader.inputs['Base Color'].default_value=(.35,.35,.35,1)
for key,socket in [('roughness','Roughness'),('emission','Emission Color')]:
 node=pbr.node_tree.nodes.new('ShaderNodeTexImage');node.image=maps[key];pbr.node_tree.links.new(node.outputs['Color'],shader.inputs[socket])
shader.inputs['Emission Strength'].default_value=1
pbr_rubber=pbr.copy();pbr_rubber.name='Rover_RubberPBR';pbr_rubber.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=0;pbr_rubber.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.012,.014,.017,1)
pbr_glass=pbr.copy();pbr_glass.name='Rover_GlassPBR';pbr_glass.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.05;pbr_glass.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.025,.035,.04,1)
for o in objects:
 old=[m.name.lower() if m else '' for m in o.data.materials]
 for index,name in enumerate(old):o.data.materials[index]=pbr_rubber if 'rubber' in name else pbr_glass if 'glass' in name else pbr
 # Consolidate identical references to keep the glTF primitive draw budget low.
 slots=list(o.data.materials);unique=list(dict.fromkeys(slots));indices=[unique.index(slots[p.material_index]) for p in o.data.polygons]
 o.data.materials.clear()
 for material in unique:o.data.materials.append(material)
 for polygon,index in zip(o.data.polygons,indices):polygon.material_index=index
 for name in [layer.name for layer in o.data.uv_layers if layer.name!='GameAtlas']:
  o.data.uv_layers.remove(o.data.uv_layers[name])
 o.data.uv_layers.active=o.data.uv_layers['GameAtlas'];o.data.uv_layers.active.active_render=True
# Decimate within the common budget after baking, preserving UV seams.
ratio=min(1,28000/source_triangles)
for o in objects:
 if triangles(o)>100:
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('GameLOD','DECIMATE');mod.ratio=ratio;bpy.ops.object.modifier_apply(modifier=mod.name)
# Tire membership survives decimation and preserves four runtime pivots.
bpy.ops.object.select_all(action='DESELECT');body=objects[0];body.select_set(True);bpy.context.view_layer.objects.active=body
body.vertex_groups.active_index=body.vertex_groups['RoverTire'].index
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='DESELECT');bpy.ops.object.vertex_group_select();bpy.ops.mesh.separate(type='SELECTED');bpy.ops.object.mode_set(mode='OBJECT')
wheel_objects=[o for o in bpy.context.selected_objects if o!=body];body.name='Rover_Chassis';objects=[body]
for o in list(wheel_objects):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='LOOSE');bpy.ops.object.mode_set(mode='OBJECT')
 for part in bpy.context.selected_objects:
  if part not in wheel_objects:wheel_objects.append(part)
centers={label:transform@Vector((x,y,1.25)) for label,x,y in [('FrontLeft',-1.7,-2.38),('FrontRight',1.7,-2.38),('RearLeft',-1.95,2.0),('RearRight',1.95,2.0)]}
groups={label:[] for label in centers}
for o in wheel_objects:
 blo,bhi=bounds([o]);c=(blo+bhi)/2;label=min(centers,key=lambda label:(c-centers[label]).length_squared);groups[label].append(o)
for label,group in groups.items():
 if not group:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in group:o.select_set(True)
 bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();wheel=bpy.context.view_layer.objects.active;wheel.name='Rover_Wheel_'+label
 blo,bhi=bounds([wheel]);scene.cursor.location=(blo+bhi)/2;bpy.ops.object.origin_set(type='ORIGIN_CURSOR');objects.append(wheel)
# Restore extents/floor after decimation and give tires explicit local X axles.
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
lo,hi=vertex_bounds(objects);extent=hi-lo;center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z));adjust=Matrix.Diagonal((min(1,2.1/extent.x),3.6/extent.y,1,1))@Matrix.Translation(-center)
for o in objects:o.matrix_world=adjust@o.matrix_world
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
scene.cursor.location=(0,0,0)
render(objects,'rover-optimized.png')
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.hide_set(False);o.hide_render=False;o.select_set(True)
bpy.context.view_layer.objects.active=body
bpy.ops.export_scene.gltf(filepath=str(OUT/'rover.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_image_format='JPEG',export_jpeg_quality=88)
lo,hi=vertex_bounds(objects)
report={'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'derivative_sha256':hashlib.sha256((OUT/'rover.glb').read_bytes()).hexdigest(),'source_triangles':source_triangles,'empty_evaluated_objects':empty_evaluated,'triangles':sum(triangles(o) for o in objects),'bytes':(OUT/'rover.glb').stat().st_size,'dimensions_blender_xyz':list(hi-lo),'dimensions_gltf_xyz':[(hi-lo).x,(hi-lo).z,(hi-lo).y],'floor':lo.z,'normalization':'3.6m length, width capped 2.1m, floor0, -Z glTF forward; width independently scaled','objects':[{'name':o.name,'triangles':triangles(o)} for o in objects],'textures':[{'kind':n,'width':i.size[0],'height':i.size[1]} for n,i in maps.items() if n!='color'],'materials':3,'limits':['Gray hull/rubber/glass PBR palette approximates source appearance. Procedural roughness and partial emission are baked; source base-color/decal graph and cyan-light details are not preserved. Metallic is .58 hull, 0 rubber and .05 glass.','Source overlay decal transparency and thin details are approximated by atlas baking; no claim of exact source shader preservation.','No suspension rig or wheel skeleton; wheel node pivots retained for runtime rotation.','Source procedural normal/bump detail is omitted; geometric normals remain.','Procedural base-color noise is omitted; generated/object-coordinate roughness can differ after chassis consolidation before baking.']}
(OUT/'rover-report.json').write_text(json.dumps(report,indent=2)+'\n');print('ROVER_REPORT '+json.dumps(report))
