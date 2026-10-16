"""Convert privately downloaded dimdimich rock 898927 to a bounded game derivative.
Run with Blender: blender -b --python scripts/prepare-rock.py -- <repo-root>
Raw FBX/RAR and original maps remain ignored; reviewed source hashes are pinned.
"""
import bpy,sys,pathlib,json,hashlib,math
from mathutils import Vector,Matrix
root=pathlib.Path(sys.argv[sys.argv.index('--')+1]);source=root/'.local/cg-props/rock-rock.FBX';archive=root/'.local/cg-props/rock-pbr.rar';textures=root/'.local/cg-props/rock-source';out=root/'.local/requested-optimized';out.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(source)=='34fc5f7ae813335026886bd9a937575de4469d8ed0affc3d1f63082b016faac8'
assert sha(archive)=='a72a6caf8e5c142d9d71ef2555a66420711a4702dcb1da16694e77fec97028af'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.fbx(filepath=str(source))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert len(meshes)==1
obj=meshes[0];source_triangles=sum(len(p.vertices)-2 for p in obj.data.polygons);source_actions=[{'name':a.name,'frames':list(a.frame_range)}for a in bpy.data.actions];assert not source_actions and not obj.modifiers
points=[obj.matrix_world@v.co for v in obj.data.vertices];lo=Vector([min(p[i]for p in points)for i in range(3)]);hi=Vector([max(p[i]for p in points)for i in range(3)]);center=(lo+hi)/2;radius=max((p-center).length for p in points)
for v,p in zip(obj.data.vertices,points):v.co=(p-center)/radius
obj.matrix_world=Matrix.Identity(4);obj.name='NysaScannedRock';obj.data.materials.clear()
# Preprocessed PNGs retain source albedo; ORM and OpenGL normal are prepared by Pillow.
def image(name,color=False):
 im=bpy.data.images.load(str(out/name));im.colorspace_settings.name='sRGB'if color else'Non-Color';return im
mat=bpy.data.materials.new('ReviewedRockPBR');mat.use_nodes=True;n=mat.node_tree.nodes;l=mat.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Metallic'].default_value=0
base=n.new('ShaderNodeTexImage');base.image=image('rock-base.png',True);l.new(base.outputs['Color'],bs.inputs['Base Color'])
orm=n.new('ShaderNodeTexImage');orm.image=image('rock-orm.png');sep=n.new('ShaderNodeSeparateColor');l.new(orm.outputs['Color'],sep.inputs['Color']);l.new(sep.outputs['Green'],bs.inputs['Roughness']);l.new(sep.outputs['Blue'],bs.inputs['Metallic'])
norm=n.new('ShaderNodeTexImage');norm.image=image('rock-normal.png');normal=n.new('ShaderNodeNormalMap');l.new(norm.outputs['Color'],normal.inputs['Color']);l.new(normal.outputs['Normal'],bs.inputs['Normal'])
group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree');group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat');gn=n.new('ShaderNodeGroup');gn.node_tree=group;l.new(sep.outputs['Red'],gn.inputs['Occlusion'])
obj.data.materials.append(mat);bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
bpy.ops.export_scene.gltf(filepath=str(out/'rock.glb'),export_format='GLB',use_selection=True,export_animations=False,export_tangents=True,export_materials='EXPORT')
report={'source_sha256':sha(source),'source_archive_sha256':sha(archive),'source_triangles':source_triangles,'source_actions':source_actions,'source_bounds':[list(lo),list(hi)],'fit':'centered unit enclosing sphere, uniform scaling, no decimation','maps':{'size':512,'normal':'DirectX green inverted to OpenGL, then vectors renormalized','orm':'source AO/roughness/metallic in RGB'},'animations':[]}
(out/'rock-report.json').write_text(json.dumps(report,indent=2)+'\n');(root/'public/assets/requested/rock-conversion.json').write_text(json.dumps(report,indent=2)+'\n')
# Neutral-lit source-map inspection of the fitted derivative.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False;scene.render.resolution_x=640;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.world.color=(.2,.2,.2)
light_data=bpy.data.lights.new('PreviewKey','AREA');light_data.energy=500;light_data.shape='DISK';light_data.size=4;light=bpy.data.objects.new('PreviewKey',light_data);scene.collection.objects.link(light);light.location=(3,-4,5)
cam_data=bpy.data.cameras.new('Preview');cam=bpy.data.objects.new('Preview',cam_data);scene.collection.objects.link(cam);cam.location=(3,-4,2.4);cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();cam_data.type='ORTHO';cam_data.ortho_scale=2.7;scene.camera=cam;scene.render.filepath=str(out/'rock-preview.png');bpy.ops.render.render(write_still=True)
print(json.dumps(report))
