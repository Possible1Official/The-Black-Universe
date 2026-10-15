"""Repair the optimized Intrepid derivative; keep raw source private.
Copy a fresh prepare-interiors.py interior export to interior-baseline.glb first.
Repairs that baseline reproducibly, opening the launch lounge and bow window.
"""
import bpy,bmesh,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'.local/requested-optimized'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/'interior-baseline.glb'))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
worlds={o:o.matrix_world.copy() for o in objects}
for o in objects:o.parent=None;o.matrix_world=worlds[o]
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
for o in objects:
 # Aft room grows from 4.2 m to 7 m with a gradual transition, retaining UVs.
 for vertex in o.data.vertices:
  if abs(vertex.co.x)<3.1 and vertex.co.y<3.4:
   t=max(0,min(1,(3.4-vertex.co.y)/2.4));vertex.co.x*=1+(.6666667*t*t*(3-2*t))
 # Cut only the bow viewport, leaving floor and overhead structure intact.
 bm=bmesh.new();bm.from_mesh(o.data)
 for axis,value in [(0,-1.7),(0,1.7),(0,-3.65),(0,3.65),(1,18.45),(2,.85),(2,3.35),(1,-6.825),(1,2.8),(2,.04),(2,4.2)]:
  point=Vector((0,0,0));point[axis]=value;normal=Vector((0,0,0));normal[axis]=1
  bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=point,plane_no=normal,clear_inner=False,clear_outer=False)
 bad=[f for f in bm.faces if (abs(f.calc_center_median().x)<1.7-.00001 and f.calc_center_median().y>18.45 and .85<f.calc_center_median().z<3.35) or (abs(f.calc_center_median().x)<3.65-.00001 and -6.825<f.calc_center_median().y<2.8 and .04<f.calc_center_median().z<4.2)]
 bmesh.ops.delete(bm,geom=bad,context='FACES');bm.to_mesh(o.data);bm.free();o.data.validate(clean_customdata=True)
# Retain authored floor finish on a continuous lounge floor and wall material.
material=next(m for m in bpy.data.materials if 'Floor01C' in m.name)
wall=next(m for m in bpy.data.materials if 'Wall' in m.name)
for name,location,dimensions,mat in [('LoungeFloor',(0,-2,-.08),(7.4,9.65,.16),material),('LoungePort',(-3.8,-2,2.25),(.2,9.65,4.5),wall),('LoungeStarboard',(3.8,-2,2.25),(.2,9.65,4.5),wall),('LoungeCeiling',(0,-2,4.5),(7.4,9.65,.15),wall)]:
 bpy.ops.mesh.primitive_cube_add(size=1,location=location);o=bpy.context.object;o.name=name;o.dimensions=dimensions;o.data.materials.append(mat);objects.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'interior.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_image_format='JPEG',export_jpeg_quality=90)
report=json.loads((OUT/'interior-report.json').read_text());report['launch_lounge_width']=7;report['bow_viewport']={'width':3.4,'height':2.5,'z':-18.85};report['bytes']=(OUT/'interior.glb').stat().st_size
(OUT/'interior-report.json').write_text(json.dumps(report,indent=2)+'\n')
