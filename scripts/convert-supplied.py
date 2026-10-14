"""Blender 4.3 offline import. Disable autoexec; inputs stay in ignored .local.
blender -b --disable-autoexec -t 2 --python scripts/convert-supplied.py -- craft|station
"""
import bpy, sys, json, hashlib
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parent.parent
kind=sys.argv[-1]
assert kind in {'craft','station'},'Expected craft or station'
out=ROOT/'.local/supplied-converted';out.mkdir(parents=True,exist_ok=True)
if kind=='station':
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'.local/supplied/blend/Space Station Scene.blend'),load_ui=False,use_scripts=False)
    names={'Station-Inside','Station-Outside','Railing','Windows','scifi column','scifi column.001','window shutter up','window shutter down'}
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and (o.name in names or o.name.startswith('door'))]
    # Legacy Blender Internal texture slots were lost by modern Blender. Rebuild
    # Principled materials from the supplied UV maps, not a remote asset service.
    maps={'Station-Inside':'Room_1_Done','Station-Outside':'out_side','Railing':'Railing','scifi column':'column','window shutter':'texture_3','door':'t1'}
    files=list((ROOT/'.local/supplied/blend').glob('*.jpg'))
    for mat in bpy.data.materials:
        mat.use_nodes=True;mat.node_tree.nodes.clear();nodes=mat.node_tree.nodes;links=mat.node_tree.links
        shader=nodes.new('ShaderNodeBsdfPrincipled');sink=nodes.new('ShaderNodeOutputMaterial');links.new(shader.outputs['BSDF'],sink.inputs['Surface'])
        shader.inputs['Base Color'].default_value=(.26,.34,.42,1);shader.inputs['Metallic'].default_value=.45;shader.inputs['Roughness'].default_value=.6
        prefix=maps.get(mat.name)
        if prefix:
            for suffix,socket in [('color','Base Color'),('rough','Roughness'),('nmap','Normal')]:
                path=next((p for p in files if p.name.startswith(prefix) and suffix in p.name),None)
                if not path:continue
                tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(path),check_existing=True)
                if suffix!='color':tex.image.colorspace_settings.name='Non-Color'
                if suffix=='nmap':
                    normal=nodes.new('ShaderNodeNormalMap');links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],shader.inputs[socket]);normal.inputs['Strength'].default_value=.5
                else:links.new(tex.outputs['Color'],shader.inputs[socket])
        if mat.name=='Windows':shader.inputs['Base Color'].default_value=(.035,.17,.21,1);shader.inputs['Metallic'].default_value=.7
    # Station native Z is up; glTF exporter maps it to Y.
    orient=Matrix.Identity(4);target_span=120
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source=ROOT/'.local/supplied/space_ship_final.fbx'
    bpy.ops.import_scene.fbx(filepath=str(source))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name not in {'Car:carBody','carBody2','pSphere2'}]
    # Imported assembly is Z up and -Y nose. Turn it to +Y nose so the glTF
    # exporter produces Y up / -Z nose, matching existing flight steering.
    orient=Matrix.Rotation(3.141592653589793,4,'Z');target_span=6.6
    for mat in bpy.data.materials:
        if mat.use_nodes:
            shader=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
            if shader:
                shader.inputs['Metallic'].default_value=.55;shader.inputs['Roughness'].default_value=.38
    # Bounded decimation preserves components; source has dense hidden internals.
    for o in meshes:
        o.data=o.data.copy();o.data.calc_loop_triangles()
        if len(o.data.loop_triangles)>1000:
            mod=o.modifiers.new('Game budget','DECIMATE');mod.ratio=.12
            bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
for o in meshes:
    world=o.matrix_world.copy();o.parent=None;o.matrix_world=orient@world
bpy.context.view_layer.update()
points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)])
scale=target_span/max(hi.x-lo.x,hi.y-lo.y)
center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
transform=Matrix.Scale(scale,4)@Matrix.Translation(-center)
for o in meshes:
    o.matrix_world=transform@o.matrix_world;o.animation_data_clear();o.hide_render=False;o.hide_viewport=False
    for material in o.data.materials:
        if material:material.use_backface_culling=True
# The orbital station is viewed at distance: 512-pixel maps bound its budget.
texture_cap=512 if kind=='station' else 1024
for index,image in enumerate(bpy.data.images):
    if image.size[0]>texture_cap or image.size[1]>texture_cap:image.scale(texture_cap,texture_cap)
    if image.size[0]>0:
        image.file_format='PNG';image.filepath_raw=str(out/f'{kind}-map-{index}.png');image.save()
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
components=len(meshes)
bpy.ops.object.join()
meshes=[bpy.context.view_layer.objects.active]
bpy.ops.export_scene.gltf(filepath=str(out/f'{kind}.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_image_format='AUTO',export_apply=True)
triangles=0
for o in meshes:o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
report={'kind':kind,'meshes':len(meshes),'source_components':components,'blender_base_triangles':triangles,'source_bounds':[list(lo),list(hi)],'scale':scale,'dimensions':list((hi-lo)*scale),'texture_cap':texture_cap,'conversion':'Blender 4.3.2, static self-contained glTF; joined static components; legacy station materials reconstructed from supplied maps; craft decimation .12 above 1000 triangles'}
(out/f'{kind}.json').write_text(json.dumps(report,indent=2)+'\n')
print('CONVERTED '+json.dumps(report))
