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
source_animation_audit={'armatures':sum(o.type=='ARMATURE' for o in bpy.data.objects),'usable_motion_clips':sum(a.frame_range[1]>a.frame_range[0] for a in bpy.data.actions),'shader_actions':len(bpy.data.actions)}
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
 scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.cycles.samples=24;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/name);bpy.ops.render.render(write_still=True)
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
 # Preserve each part's shader coordinates before joining/normalization.
 # Otherwise Object coordinates become assembly coordinates and alter the
 # scale/placement of the creator's procedural patterns.
 for attr_name in ['GameSourceObject','GameSourceGenerated']:
  attr=mesh.attributes.new(attr_name,'FLOAT_VECTOR','POINT')
  lo=Vector([min(v.co[i] for v in mesh.vertices) for i in range(3)])
  hi=Vector([max(v.co[i] for v in mesh.vertices) for i in range(3)])
  for vertex,item in zip(mesh.vertices,attr.data):
   item.vector=vertex.co if attr_name=='GameSourceObject' else Vector([(vertex.co[i]-lo[i])/max(hi[i]-lo[i],1e-8) for i in range(3)])
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
# Bake source Object/Generated coordinates stored above, not the joined bounds.
visited_trees=set()
def preserve_coordinates(tree):
 if tree in visited_trees:return
 visited_trees.add(tree)
 for node in list(tree.nodes):
  if node.type=='GROUP':preserve_coordinates(node.node_tree)
  if node.type!='TEX_COORD':continue
  for socket,attribute in [('Object','GameSourceObject'),('Generated','GameSourceGenerated')]:
   if socket=='Object' and node.object:continue
   links=list(node.outputs[socket].links)
   if not links:continue
   saved=tree.nodes.new('ShaderNodeAttribute');saved.attribute_name=attribute
   for link in links:tree.links.new(saved.outputs['Vector'],link.to_socket)
for o in objects:
 for material in o.data.materials:
  if material and material.use_nodes:preserve_coordinates(material.node_tree)
# Reduce geometry before atlas layout so UV islands and tangent frames match
# the exported mesh; baked tangent frames must match the exported topology.
ratio=min(1,28000/source_triangles)
for o in objects:
 if triangles(o)>100:
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('GameLOD','DECIMATE');mod.ratio=ratio;bpy.ops.object.modifier_apply(modifier=mod.name)
# Bake supported creator shaders to bounded portable 1024 atlases.
for o in objects:
 bpy.context.view_layer.objects.active=o;o.select_set(True);o.hide_set(False)
 # Original UV layer remains available to source decal shaders.
 original=o.data.uv_layers.active
 if original:original.active_render=True
 o.data.uv_layers.new(name='GameAtlas');o.data.uv_layers.active_index=len(o.data.uv_layers)-1
bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=math.radians(65),island_margin=.004,area_weight=.5);bpy.ops.object.mode_set(mode='OBJECT')
materials={m for o in objects for m in o.data.materials if m and m.use_nodes}
maps={}
scene.cycles.samples=4;scene.render.bake.margin=3;scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True
for name,kind in [('roughness','ROUGHNESS'),('emission','EMIT'),('normal','NORMAL'),('color','EMIT')]:
 image=bpy.data.images.new('RoverAtlas_'+name,width=1024,height=1024,alpha=False)
 if name in {'roughness','normal'}:image.colorspace_settings.name='Non-Color'
 # Color is baked through emission, because diffuse baking loses metallic albedo.
 # Temporarily rewire nested Principled surfaces; restore before the next pass.
 saved=[]
 if name=='color':
  visited=set()
  def expose_albedo(tree):
   if tree in visited:return
   visited.add(tree)
   for shader in tree.nodes:
    if shader.type=='GROUP':expose_albedo(shader.node_tree)
    if shader.type!='BSDF_PRINCIPLED':continue
    for socket in ['Emission Color','Emission Strength']:
     inp=shader.inputs[socket];value=inp.default_value
     saved.append((tree,inp,list(value) if hasattr(value,'__len__') else value,[(l.from_socket,l.to_socket) for l in inp.links]))
     for link in list(inp.links):tree.links.remove(link)
    source=shader.inputs['Base Color'];dest=shader.inputs['Emission Color']
    dest.default_value=source.default_value
    if source.is_linked:tree.links.new(source.links[0].from_socket,dest)
    shader.inputs['Emission Strength'].default_value=1
  for m in materials:expose_albedo(m.node_tree)
 for m in materials:
  node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;m.node_tree.nodes.active=node
 bpy.ops.object.bake(type=kind,uv_layer='GameAtlas',use_clear=True,use_selected_to_active=False);
 for tree,inp,value,links in saved:
  for link in list(inp.links):tree.links.remove(link)
  inp.default_value=value
  for a,b in links:tree.links.new(a,b)
 # Tiny atlas islands can filter toward zero roughness. Keep a safe lower
 # bound so a missing/near-zero texel cannot become a mirror-like white patch.
 if name=='roughness':
  pixels=list(image.pixels[:])
  for i in range(0,len(pixels),4):
   for channel in range(3):pixels[i+channel]=max(.42,min(.95,pixels[i+channel]))
  image.pixels[:]=pixels
 image.filepath_raw=str(OUT/f'rover-{name}.png');image.file_format='PNG';image.save();maps[name]=image
 for m in materials:
  for node in list(m.node_tree.nodes):
   if node.type=='TEX_IMAGE' and node.image==image:m.node_tree.nodes.remove(node)
# Preserve source albedo and tangent detail in standard lit glTF PBR.
pbr=bpy.data.materials.new('Rover_BakedPBR');pbr.use_nodes=True;pbr.use_backface_culling=True
shader=pbr.node_tree.nodes.get('Principled BSDF');shader.inputs['Metallic'].default_value=.58
shader.inputs['Base Color'].default_value=(.35,.35,.35,1)
for key,socket in [('color','Base Color'),('roughness','Roughness'),('emission','Emission Color')]:
 node=pbr.node_tree.nodes.new('ShaderNodeTexImage');node.image=maps[key];pbr.node_tree.links.new(node.outputs['Color'],shader.inputs[socket])
normal=pbr.node_tree.nodes.new('ShaderNodeTexImage');normal.image=maps['normal']
normal_map=pbr.node_tree.nodes.new('ShaderNodeNormalMap');normal_map.inputs['Strength'].default_value=.65
pbr.node_tree.links.new(normal.outputs['Color'],normal_map.inputs['Color']);pbr.node_tree.links.new(normal_map.outputs['Normal'],shader.inputs['Normal'])
shader.inputs['Emission Strength'].default_value=.7
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
report={'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'derivative_sha256':hashlib.sha256((OUT/'rover.glb').read_bytes()).hexdigest(),'source_triangles':source_triangles,'empty_evaluated_objects':empty_evaluated,'triangles':sum(triangles(o) for o in objects),'bytes':(OUT/'rover.glb').stat().st_size,'dimensions_blender_xyz':list(hi-lo),'dimensions_gltf_xyz':[(hi-lo).x,(hi-lo).z,(hi-lo).y],'floor':lo.z,'normalization':'3.6m length, width capped 2.1m, floor0, -Z glTF forward; width independently scaled','objects':[{'name':o.name,'triangles':triangles(o)} for o in objects],'textures':[{'kind':n,'width':i.size[0],'height':i.size[1]} for n,i in maps.items() ],'materials':3,'source_animation_audit':source_animation_audit,'roughness_range':[.42,.95],'limits':['Source albedo, tangent normal, roughness and emission are baked to 1024 atlases. Metallic is .58 hull, 0 rubber and .05 glass rather than the source procedural metal map.','Source overlay decal transparency and thin details are approximated by atlas baking; no claim of exact source shader preservation.','No suspension rig or wheel skeleton; wheel node pivots retained for runtime rotation.','Source tangent detail is baked on final topology; roughness clamped .42–.95, normal strength .65 and emission .7 are bounded for game lighting.','Object/Generated coordinates are retained per source part; attribute-driven overlays and procedural edge wear can still differ after consolidation. No source motion clips or armature; four single-frame shader actions are not exported.']}
(OUT/'rover-report.json').write_text(json.dumps(report,indent=2)+'\n');print('ROVER_REPORT '+json.dumps(report))
