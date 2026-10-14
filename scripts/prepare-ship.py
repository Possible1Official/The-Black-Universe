"""Offline bounded ship conversion, using private licensed source.
Blender -b --disable-autoexec --python scripts/prepare-ship.py -- <source> <turn-degrees>
Inspect source/final render before publishing a proprietary game resource derivative.
"""
import bpy,sys,math,json,hashlib,struct
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'.local/requested-optimized';OUT.mkdir(parents=True,exist_ok=True)
args=sys.argv[sys.argv.index('--')+1:];source=Path(args[0]).resolve();turn=math.radians(float(args[1])) if len(args)>1 else 0
bpy.ops.wm.read_factory_settings(use_empty=True)
if source.suffix.lower()=='.blend':bpy.ops.wm.open_mainfile(filepath=str(source))
elif source.suffix.lower()=='.fbx':bpy.ops.import_scene.fbx(filepath=str(source))
elif source.suffix.lower() in ('.gltf','.glb'):bpy.ops.import_scene.gltf(filepath=str(source))
elif source.suffix.lower()=='.obj':bpy.ops.wm.obj_import(filepath=str(source))
else:raise RuntimeError('Unsupported private source format')
# Preprocessed disk maps keep memory bounded before source texture decoding.
for image in bpy.data.images:
 if image.filepath:
  original=Path(bpy.path.abspath(image.filepath))
  try:derivative=OUT/'ship-textures'/original.relative_to(source.parent)
  except ValueError:continue
  if derivative.is_file():image.filepath=str(derivative);image.reload()
meshes=[o for o in bpy.data.objects if o.type=='MESH' and not o.hide_render]
if not meshes:raise RuntimeError('No visible spacecraft meshes')
def box():
 bpy.context.view_layer.update();verts=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box];return Vector([min(v[i] for v in verts) for i in range(3)]),Vector([max(v[i] for v in verts) for i in range(3)])
def render(label):
 for o in bpy.context.scene.objects:o.hide_render=o not in meshes
 lo,hi=box();center=(lo+hi)*.5;size=max(hi-lo)
 camera=bpy.data.objects.new('ShipPreparationCamera',bpy.data.cameras.new('ShipPreparationCamera'));bpy.context.collection.objects.link(camera);camera.location=center+Vector((size*1.4,size*1.5,size));camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=size*1.4;bpy.context.scene.camera=camera
 for i,pos in enumerate([(2,2,3),(-2,-1,2)]):
  light=bpy.data.objects.new('ShipPreparationLight'+str(i),bpy.data.lights.new('ShipPreparationLight'+str(i),'AREA'));bpy.context.collection.objects.link(light);light.location=center+Vector(pos)*size;light.data.energy=400*size*size;light.data.size=size*2;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=False;scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.world.color=(.05,.05,.05);scene.render.filepath=str(OUT/('ship-'+label+'.png'));bpy.ops.render.render(write_still=True)
 for o in list(bpy.data.objects):
  if o.name.startswith('ShipPreparation'):bpy.data.objects.remove(o,do_unlink=True)
if '--skip-source-render' not in args:render('source')
# Bake evaluated visible source geometry and hierarchy transforms; ship is a rigid actor.
for i,o in enumerate(meshes):
 bpy.context.view_layer.objects.active=o
 for modifier in list(o.modifiers):
  try:bpy.ops.object.modifier_apply(modifier=modifier.name)
  except RuntimeError:o.modifiers.remove(modifier)
 world=o.matrix_world.copy();o.parent=None;o.matrix_world=world;o.name='ShipPart'+str(i)
rotation=Matrix.Rotation(turn,4,'Z')
for o in meshes:o.matrix_world=rotation@o.matrix_world
lo,hi=box();extent=hi-lo;factor=min(4.94/extent.x,6.62/extent.y,2.84/extent.z);center=Vector(((hi.x+lo.x)*.5,(hi.y+lo.y)*.5,lo.z));transform=Matrix.Scale(factor,4)@Matrix.Translation(-center)
for o in meshes:o.matrix_world=transform@o.matrix_world
for o in meshes:o.data.calc_loop_triangles()
original=sum(len(o.data.loop_triangles) for o in meshes);ratio=min(1,57000/original)
for o in meshes:
 if len(o.data.loop_triangles)>100:
  bpy.context.view_layer.objects.active=o;m=o.modifiers.new('GameLOD','DECIMATE');m.ratio=ratio;bpy.ops.object.modifier_apply(modifier=m.name)
# Merge rigid parts sharing source materials to bound runtime draws.
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.hide_set(False);o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();meshes=[bpy.context.view_layer.objects.active]
materials={m for o in meshes for m in o.data.materials if m};images={node.image for m in materials if m.use_nodes for node in m.node_tree.nodes if node.type=='TEX_IMAGE' and node.image};dimensions=[]
for i,image in enumerate(sorted(images,key=lambda image:image.name)):
 if max(image.size)>1024:raise RuntimeError('Preprocess source maps to <=1024 before conversion')
 image.name='ShipMap'+str(i);dimensions.append(list(image.size))
for i,material in enumerate(sorted(materials,key=lambda m:m.name)):material.name='ShipPBR'+str(i)
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
path=OUT/'ship.glb';bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_image_format='JPEG',export_jpeg_quality=85)
render('optimized');lo,hi=box();data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0];gltf=json.loads(data[20:20+length]);triangles=sum(gltf['accessors'][p['indices']]['count']//3 for mesh in gltf['meshes'] for p in mesh['primitives'])
if triangles>60000 or any(max(size)>1024 for size in dimensions):raise RuntimeError('Ship exceeds bounded resource budget')
report={'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'source_triangles':original,'triangles':triangles,'primitive_draws':sum(len(mesh['primitives']) for mesh in gltf['meshes']),'textures':dimensions,'bounds_blender':[list(lo),list(hi)],'uniform_scale':factor,'turn_degrees':math.degrees(turn),'orientation':'nose -Z glTF; visually verify against source','external_uris':[image.get('uri') for image in gltf.get('images',[]) if image.get('uri')]}
(OUT/'ship-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
