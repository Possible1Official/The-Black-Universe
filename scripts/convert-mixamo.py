"""Blender 4.3: bounded Ely FBX -> local GLB with in-place Idle/Walking.
Run: blender -b -t 2 --python scripts/convert-mixamo.py
Source FBX files are acquired through scripts/mixamo-import.py, never tracked.
"""
import bpy
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / '.local/mixamo-assets/f7b85d05-5f1c-47d8-9770-9a1a054bd6f6'
OUT = ROOT / 'public/assets/crew'
CHARACTER = 'f7b85d05-5f1c-47d8-9770-9a1a054bd6f6'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 30
bpy.ops.import_scene.fbx(filepath=str(RAW / 'character.fbx'))
armature = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
armature.animation_data_clear()
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)
clips = []
for label in ['Idle', 'Walking']:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(RAW / f'{label}_{CHARACTER}.fbx'))
    imported = set(bpy.data.objects) - before
    source = next(o for o in imported if o.type == 'ARMATURE')
    action = source.animation_data.action
    action.name = label
    action.use_fake_user = True
    # Imported hip local Y is vertical; X/Z translate across the ground plane.
    # Rapier owns locomotion, so preserve vertical bob and remove root drift.
    stride = 0
    for curve in action.fcurves:
        if curve.data_path == 'pose.bones["mixamorig:Hips"].location' and curve.array_index in (0, 2):
            if curve.array_index == 2:
                stride = (curve.keyframe_points[-1].co.y - curve.keyframe_points[0].co.y) * .01
            for key in curve.keyframe_points:
                key.co.y = 0
                key.handle_left.y = key.handle_right.y = 0
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    armature.animation_data_create()
    track = armature.animation_data.nla_tracks.new()
    track.name = label
    strip = track.strips.new(label, 1, action)
    strip.name = label
    clips.append({'name': label, 'duration': (action.frame_range[1]-action.frame_range[0])/30, 'source_stride_m': abs(stride)})
# Preserve the four embedded source maps with bounded metallic/roughness factors.
for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    shader = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    material.use_backface_culling = True
    shader.inputs['Metallic'].default_value = .35
    shader.inputs['Roughness'].default_value = .55
    for image in bpy.data.images:
        if image.size[0] > 2048 or image.size[1] > 2048:
            image.scale(min(image.size[0],2048), min(image.size[1],2048))
# The imported skin is already meter-scale. Bounds are evaluated in rest pose.
armature.data.pose_position = 'REST'
bpy.context.view_layer.update()
bounds = [o.matrix_world @ Vector(v) for o in meshes for v in o.bound_box]
height = max(v.z for v in bounds)-min(v.z for v in bounds)
feet = min(v.z for v in bounds)
armature.data.pose_position = 'POSE'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for obj in [armature]+meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = armature
bpy.ops.export_scene.gltf(filepath=str(OUT/'ely.glb'),export_format='GLB',use_selection=True,
    export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,
    export_anim_slide_to_zero=True,export_anim_single_armature=True,export_all_influences=False,
    export_def_bones=True,export_skins=True,export_yup=True,export_image_format='AUTO')
mesh = meshes[0].data
mesh.calc_loop_triangles()
print(json.dumps({'height_m':height,'feet_offset_m':feet,'triangles':len(mesh.loop_triangles),'bones':len(armature.data.bones),'clips':clips,'glb_bytes':(OUT/'ely.glb').stat().st_size}))
