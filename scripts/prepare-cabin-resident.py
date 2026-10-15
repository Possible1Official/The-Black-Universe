"""Prepare user-selected CGTrader #2712319 as a static bed resident.
Raw sources remain private; preserves the authored lying pose (not rigged).
"""
import bpy,json,math,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'.local/requested-optimized';source=ROOT/'.local/cg-props/cute-girl/blend/girl.blend'
bpy.ops.wm.open_mainfile(filepath=str(source),use_scripts=False,load_ui=False)
objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('varina')];bpy.context.view_layer.update()
points=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box];lo=Vector([min(v[i] for v in points) for i in range(3)]);hi=Vector([max(v[i] for v in points) for i in range(3)])
size=hi-lo;factor=1.65/max(size.x,size.y);turn=math.pi/2 if size.y>size.x else 0;transform=Matrix.Rotation(turn,4,'Z')@Matrix.Scale(factor,4)@Matrix.Translation(Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)))
for o in objects:
 world=o.matrix_world.copy();o.parent=None;o.matrix_world=transform@world
materials={slot.material for o in objects for slot in o.material_slots if slot.material};cache={}
for m in materials:
 tex=next((n.image for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image),None) if m.use_nodes else None
 color=tuple(m.diffuse_color);m.use_nodes=True;m.node_tree.nodes.clear();shader=m.node_tree.nodes.new('ShaderNodeBsdfPrincipled');out=m.node_tree.nodes.new('ShaderNodeOutputMaterial');m.node_tree.links.new(shader.outputs['BSDF'],out.inputs['Surface']);shader.inputs['Base Color'].default_value=color;shader.inputs['Roughness'].default_value=.7;shader.inputs['Metallic'].default_value=0;shader.inputs['Emission Strength'].default_value=0
 if tex:
  if tex.name not in cache:
   path=ROOT/'.local/cg-props/cute-girl/varina'/Path(tex.filepath).name
   if path.exists():tex.filepath=str(path);tex.reload()
   w,h=tex.size
   if max(w,h)>1024:tex.scale(round(w*1024/max(w,h)),round(h*1024/max(w,h)))
   w,h=tex.size;im=bpy.data.images.new('Resident_'+str(len(cache)),width=w,height=h,alpha=True);im.pixels.foreach_set(tex.pixels[:]);im.update();im.filepath_raw=str(OUT/(im.name+'.png'));im.file_format='PNG';im.save();cache[tex.name]=im
  n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=cache[tex.name];m.node_tree.links.new(n.outputs['Color'],shader.inputs['Base Color'])
 m.use_backface_culling=False
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.export_scene.gltf(filepath=str(OUT/'resident.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_image_format='JPEG',export_jpeg_quality=90)
report={'source_sha256':hashlib.sha256((ROOT/'.local/cg-props/girl.rar').read_bytes()).hexdigest(),'creator':'seemlyhasan','source_model_id':2712319,'pose':'authored static lying pose; no rig or sitting animation claimed','length':1.65,'source_pedestal_removed':True,'bytes':(OUT/'resident.glb').stat().st_size};(OUT/'resident-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
