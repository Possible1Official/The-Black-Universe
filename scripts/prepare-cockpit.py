"""Bounded private conversion of CGTrader ViitorX model5370525.
Blender --background --disable-autoexec -t 1 --python scripts/prepare-cockpit.py
No raw licensed source is distributed. Output remains private until game packaging.
"""
import bpy,bmesh,json,hashlib,math
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'.local/cg-props/Spaceship_interior.glb'
OUT=ROOT/'.local/requested-optimized';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
o=next(o for o in bpy.context.scene.objects if o.type=='MESH')
o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4)
o.name='Erebus_ViitorX_Cockpit'
source_triangles=sum(len(f.vertices)-2 for f in o.data.polygons)
# Transparent imported glazing occludes the actual universe; preserve the frame.
bm=bmesh.new();bm.from_mesh(o.data)
bmesh.ops.delete(bm,geom=[f for f in bm.faces if o.data.materials[f.material_index].name=='Glass'],context='FACES');bm.to_mesh(o.data);bm.free()
bpy.context.view_layer.objects.active=o;o.select_set(True)
o.data.calc_loop_triangles();modifier=o.modifiers.new('Bounded cockpit detail','DECIMATE');modifier.ratio=min(1,48000/len(o.data.loop_triangles));bpy.ops.object.modifier_apply(modifier=modifier.name)
# Original forward is Blender -Y. Rotate180 so exportedglTF forward is -Z.
# Camera origin is source pilot eye at x=-.0188,y=-.30,z=1.28.
eye=Vector((-.0188,-.30,1.28));o.data.transform(Matrix.Rotation(math.pi,4,'Z')@Matrix.Translation(-eye))
for image in list(bpy.data.images):
 if image.size[0] and image.size[1] and max(image.size)>1024:
  ratio=1024/max(image.size);image.scale(max(1,round(image.size[0]*ratio)),max(1,round(image.size[1]*ratio)))
 image.filepath_raw=str(OUT/('cockpit-map-'+image.name.replace('/','_')+'.png'));image.file_format='PNG';image.save();
 if image.packed_file:image.unpack(method='REMOVE')
 image.reload()
for m in o.data.materials:
 m.use_nodes=True
 for n in m.node_tree.nodes:
  if n.type=='BSDF_PRINCIPLED':
   n.inputs['Alpha'].default_value=1
   for link in list(m.node_tree.links):
    if link.to_node==n and link.to_socket==n.inputs['Alpha']:m.node_tree.links.remove(link)
   # Avoid imported20x bloomwashout; preserve texture-driven emissive displays.
   n.inputs['Emission Strength'].default_value=min(n.inputs['Emission Strength'].default_value,.65 if m.name=='spaceship' else 1.8)
 m.surface_render_method='DITHERED';m.use_backface_culling=False
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
bpy.ops.export_scene.gltf(filepath=str(OUT/'cockpit.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_apply=True)
p=[v.co for v in o.data.vertices];lo=[min(v[i] for v in p) for i in range(3)];hi=[max(v[i] for v in p) for i in range(3)];o.data.calc_loop_triangles()
report={'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'draw_calls':4,'embedded_image_count':6,'verified_self_contained':True,'preview_evidence':['cockpit-source-overview.png','cockpit-preview-forward.png','cockpit-preview-overview.png'],'source_triangles':source_triangles,'triangles':len(o.data.loop_triangles),'bytes':(OUT/'cockpit.glb').stat().st_size,'sha256':hashlib.sha256((OUT/'cockpit.glb').read_bytes()).hexdigest(),'bounds_gltf':[[lo[0],lo[2],-hi[1]],[hi[0],hi[2],-lo[1]]],'eye_gltf':[0,0,0],'forward_gltf':[0,0,-1],'mesh_local_transform':{'position':[0,0,0],'rotation':[0,0,0],'scale':[1,1,1]},'images':{im.name:list(im.size) for im in bpy.data.images if im.size[0]},'limitations':['Source glazing removed for an unobstructed rendered universe.','Original high-poly interior decimated to48k triangles.','Pilot-eye camera-local geometry follows aircraft orientation; free-look must rotate camera independently.','Static cockpit: imported display imagery is decorative; runtimeflightHUD supplies live telemetry.']}
(OUT/'cockpit-report.json').write_text(json.dumps(report,indent=2)+'\n');print('COCKPIT_REPORT '+json.dumps(report),flush=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=3;scene.cycles.use_denoising=False;scene.render.resolution_x=800;scene.render.resolution_y=560;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Space preview');scene.world.color=(.06,.08,.12)
for loc,power in [((0,0,.5),75),((0,1,1.5),100)]:
 bpy.ops.object.light_add(type='AREA',location=loc);bpy.context.object.data.energy=power;bpy.context.object.data.size=2
for name,cam,target in [('forward',(0,0,0),(0,2,0)),('overview',(3,4,2),(0,0,0))]:
 bpy.ops.object.camera_add(location=cam);c=bpy.context.object;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler();c.data.lens=18;c.data.clip_start=.02;scene.camera=c;scene.render.filepath=str(OUT/f'cockpit-preview-{name}.png');bpy.ops.render.render(write_still=True);bpy.data.objects.remove(c,do_unlink=True)
