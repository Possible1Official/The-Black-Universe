"""Private Blender conversion of user-selected CGTrader ship interiors.
Run Blender 4.3 --background --disable-autoexec -t 2 --python
scripts/prepare-interiors.py -- corridor|bedroom|interior. Raw stock files remain ignored.
DDS preprocessing: python scripts/prepare-interiors.py decode-intrepid-maps
after safely extracting Textures_DDS.zip into .local/requested-source/intrepid-textures.
Use --python-exit-code 1 so conversion errors fail the process.
"""
import json, sys, hashlib, math, stat
from pathlib import Path
if sys.argv[-1]=="decode-intrepid-maps":
    from PIL import Image
    project=Path(__file__).resolve().parent.parent
    source=project/".local/requested-source/intrepid-textures"
    destination=project/".local/requested-source/intrepid-decoded"
    destination.mkdir(parents=True,exist_ok=True)
    files=list(source.rglob("*.dds"))
    if not files:raise ValueError("Extract licensed DDS archive first")
    for file in files:
        with Image.open(file) as image:
            image=image.convert("RGBA");image.thumbnail((512,512),Image.Resampling.LANCZOS);image.save(destination/(file.stem+".png"))
    print("Decoded "+str(len(files))+" bounded authored DDS maps");sys.exit(0)
if sys.argv[-1]=="cap-bedroom-images":
    # Rewrite only embedded image buffer views. Geometry bytes stay identical.
    import io, struct
    from PIL import Image
    project=Path(__file__).resolve().parent.parent
    artifact=project/".local/requested-optimized/bedroom.glb"
    original=artifact.read_bytes();json_length=struct.unpack_from("<I",original,12)[0]
    document=json.loads(original[20:20+json_length]);bin_header=20+json_length
    bin_length=struct.unpack_from("<I",original,bin_header)[0]
    binary=original[bin_header+8:bin_header+8+bin_length]
    assert len(document["buffers"])==1 and all(view.get("buffer",0)==0 for view in document["bufferViews"])
    image_views={item["bufferView"]:item for item in document.get("images",[])}
    output=bytearray();dimensions=[];geometry_digest_before=hashlib.sha256();geometry_digest_after=hashlib.sha256()
    for index,view in enumerate(document["bufferViews"]):
        start=view.get("byteOffset",0);content=binary[start:start+view["byteLength"]]
        if index in image_views:
            with Image.open(io.BytesIO(content)) as image:
                image.load();before=list(image.size)
                if max(image.size)>1024:
                    image.thumbnail((1024,1024),Image.Resampling.LANCZOS)
                    encoded=io.BytesIO()
                    if image_views[index].get("mimeType")=="image/jpeg":image.convert("RGB").save(encoded,format="JPEG",quality=90)
                    else:image.save(encoded,format="PNG");image_views[index]["mimeType"]="image/png"
                    content=encoded.getvalue()
                with Image.open(io.BytesIO(content)) as verified:
                    actual=list(verified.size)
                    assert max(actual)<=1024,"Encoded image exceeds cap"
                dimensions.append({"name":image_views[index].get("name",str(index)),"before":before,"encoded":actual,"bytes":len(content)})
        else:
            geometry_digest_before.update(content);geometry_digest_after.update(content)
        output.extend(bytes((-len(output))%4));view["byteOffset"]=len(output);view["byteLength"]=len(content);output.extend(content)
    assert geometry_digest_before.digest()==geometry_digest_after.digest()
    document["buffers"][0]["byteLength"]=len(output)
    encoded_json=json.dumps(document,separators=(",",":")).encode();encoded_json+=b" "*((-len(encoded_json))%4)
    output.extend(bytes((-len(output))%4))
    rebuilt=struct.pack("<III",0x46546c67,2,12+8+len(encoded_json)+8+len(output))+struct.pack("<II",len(encoded_json),0x4e4f534a)+encoded_json+struct.pack("<II",len(output),0x004e4942)+output
    artifact.write_bytes(rebuilt)
    report_path=project/".local/requested-optimized/bedroom-report.json";report=json.loads(report_path.read_text());report.update({"bytes":len(rebuilt),"encoded_images":dimensions,"texture_cap":1024,"geometry_buffer_sha256":geometry_digest_before.hexdigest(),"image_verification":"Actual embedded JPEG/PNG headers; every non-image buffer view preserved byte-for-byte"});report_path.write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({"sha256":hashlib.sha256(rebuilt).hexdigest(),"bytes":len(rebuilt),"images":dimensions,"geometry_preserved":True}));sys.exit(0)
import bpy
from zipfile import ZipFile
from mathutils import Vector, Matrix
ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'.local/requested-source'
OUT=ROOT/'.local/requested-optimized';OUT.mkdir(parents=True,exist_ok=True)

def safe_extract(archive, destination):
    destination=destination.resolve();destination.mkdir(parents=True,exist_ok=True)
    with ZipFile(archive) as z:
        if sum(i.file_size for i in z.infolist())>2_000_000_000:raise ValueError('Archive exceeds import budget')
        for entry in z.infolist():
            target=(destination/entry.filename).resolve()
            if not target.is_relative_to(destination) or stat.S_ISLNK(entry.external_attr>>16):raise ValueError('Unsafe archive path')
        z.extractall(destination)

def persisted_image(image,label,cap=1024):
    # Saving a fresh file and loading a new datablock prevents the glTF exporter
    # from copying stale packed/original encoded bytes after image.scale().
    width,height=image.size
    if width==0 or height==0:raise ValueError('Missing texture image')
    if max(width,height)>cap:
        factor=cap/max(width,height);image.scale(max(1,round(width*factor)),max(1,round(height*factor)))
    image.pixels[0]  # Force loading before changing the file-backed image path.
    color_space=image.colorspace_settings.name
    target=OUT/(label+'.png');image.file_format='PNG';image.filepath_raw=str(target);image.save()
    header=target.read_bytes()[:24]
    if header[:8]!=b'\x89PNG\r\n\x1a\n' or max(int.from_bytes(header[16:20],'big'),int.from_bytes(header[20:24],'big'))>cap:raise ValueError('Saved texture exceeds encoded cap')
    fresh=bpy.data.images.load(str(target),check_existing=False);fresh.colorspace_settings.name=color_space
    return fresh

def bounds(objects):
    p=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
    return Vector([min(v[i] for v in p) for i in range(3)]),Vector([max(v[i] for v in p) for i in range(3)])
def triangles(o):o.data.calc_loop_triangles();return len(o.data.loop_triangles)
def simplify(o,limit):
    if triangles(o)>limit:
        if o.data.users>1:o.data=o.data.copy()
        bpy.context.view_layer.objects.active=o
        modifier=o.modifiers.new('Game budget','DECIMATE');modifier.ratio=limit/triangles(o)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
def render(objects, kind, camera, target):
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=4;scene.cycles.use_denoising=False
    scene.render.resolution_x=800;scene.render.resolution_y=560;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Game preview world');scene.world.color=(.12,.12,.12)
    bpy.ops.object.camera_add(location=camera);cam=bpy.context.object;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=18;cam.data.clip_start=.05;scene.camera=cam
    lo,hi=bounds(objects);height=min(hi.z-.5,3.5 if kind!='corridor' else 5.5);depth=hi.y-lo.y
    for loc,power,size in [((0,0,height),1400,4),((0,depth/3,height),1200,4),((0,-depth/3,height),1200,4)]:
        bpy.ops.object.light_add(type='AREA',location=loc);lamp=bpy.context.object;lamp.data.energy=power;lamp.data.shape='DISK';lamp.data.size=size
    scene.render.filepath=str(OUT/f'{kind}-preview.png');bpy.ops.render.render(write_still=True)
    for o in list(scene.objects):
        if o.type in {'CAMERA','LIGHT'}:bpy.data.objects.remove(o,do_unlink=True)

def corridor():
    archive=ROOT/'.local/cg-props/fbx.zip';folder=SOURCE/'corridor'
    safe_extract(archive,folder);source=folder/'fbx/Sci Fi Corridor.fbx'
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.fbx(filepath=str(source))
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name=='Sci_Fi_Corridor']
    for o in list(bpy.context.scene.objects):
        if o not in objects:bpy.data.objects.remove(o,do_unlink=True)
    initial=sum(triangles(o) for o in objects)
    lo,hi=bounds(objects);span=hi-lo
    # Floor0, local BlenderY long axis -> glTF -Z, widened hangar adaptation.
    center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
    desired=Vector((10,24,6));scale=Vector([desired[i]/span[i] for i in range(3)])
    transform=Matrix.Diagonal((*scale,1))@Matrix.Translation(-center)
    for o in objects:
        world=o.matrix_world.copy();o.parent=None;o.matrix_world=transform@world;o.animation_data_clear()
        o.data=o.data.copy()
        while o.data.uv_layers:o.data.uv_layers.remove(o.data.uv_layers[-1])
        simplify(o,37000)
        o.name='Erebus_Runway_OpenShell'
    for material in bpy.data.materials:
        material.use_nodes=True;shader=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        shader.inputs['Metallic'].default_value=.58;shader.inputs['Roughness'].default_value=.4
        if material.name=='Blue Blue':
            shader.inputs['Base Color'].default_value=(.005,.12,.2,1);shader.inputs['Emission Color'].default_value=(.005,.45,.65,1);shader.inputs['Emission Strength'].default_value=2.4
        elif material.name.strip()=='Screen':
            shader.inputs['Base Color'].default_value=(.015,.045,.06,1);shader.inputs['Emission Color'].default_value=(.03,.2,.3,1);shader.inputs['Emission Strength'].default_value=.6
        elif material.name=='White Glow':
            shader.inputs['Base Color'].default_value=(.72,.85,.9,1);shader.inputs['Emission Color'].default_value=(.65,.88,1,1);shader.inputs['Emission Strength'].default_value=1.2
        material.use_backface_culling=False
    # FBX has no original cyan light spectra; add compact game-specific strips.
    cyan=bpy.data.materials.get('Blue Blue')
    for side in [-1,1]:
        for y in [-10,-6,-2,2,6,10]:
            bpy.ops.mesh.primitive_cube_add(size=1,location=(side*4.15,y,4.2))
            strip=bpy.context.object;strip.name='Runway_Cyan_Strip';strip.dimensions=(.04,2.8,.08);strip.data.materials.append(cyan);objects.append(strip)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects=[bpy.context.object]
    bpy.context.view_layer.update()
    render(objects,'corridor',(0,-11,1.7),(0,10,1.7))
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.export_scene.gltf(filepath=str(OUT/'corridor.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_apply=True)
    lo,hi=bounds(objects)
    report={'source_archive_sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'source_triangles':initial,'triangles':sum(triangles(o) for o in objects),'bytes':(OUT/'corridor.glb').stat().st_size,'dimensions_gltf_xyz':[(hi-lo).x,(hi-lo).z,(hi-lo).y],'bounds_gltf':[[lo.x,lo.z,-hi.y],[hi.x,hi.z,-lo.y]],'meshes':[o.name for o in objects],'materials':len(set(p.material_index for p in objects[0].data.polygons)),'textures':0,'floor_y':0,'open_endpoints':True,'proxy_walkway':{'half_width':3.7,'length':24,'floor_y':0,'ceiling_y':5.4},'limitations':['Original Cinema4D procedural shaders/images are absent from supplied FBX; surface colors reconstructed by source identifiers;12 compact cyan game-specific light strips restore preview illumination cues.','Original Frame/Door removed for open runway endpoints.','Independent width/height normalization adapts narrow corridor to hangar use; approximate collider walkway requires in-game QA.','Static mesh reduced by collapse decimation to bounded game budget; no imported lights.']}
    (OUT/'corridor-report.json').write_text(json.dumps(report,indent=2)+'\n');print('CORRIDOR_REPORT '+json.dumps(report))

def bedroom():
    source=ROOT/'.local/cg-props/EndlessJourney.blend'
    bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False,use_scripts=False)
    scene=bpy.context.scene;textures=SOURCE/'bedroom-textures'
    # Avoid evaluating millions of procedural source polygons. Only cheap
    # structural mirror/solidify refinements survive this game derivative.
    for item in scene.objects:
        for mod in list(item.modifiers):
            if mod.type not in {'MIRROR','SOLIDIFY'}:item.modifiers.remove(mod)
        if item.type=='CURVE':item.data.resolution_u=2;item.data.bevel_resolution=0
    bpy.context.view_layer.update()
    if textures.exists():
        for image in bpy.data.images:
            if image.name not in {'MonitorDisplay.png','GrungeMap.png'}:continue
            matches=[p for p in textures.rglob('*') if p.is_file() and p.name.lower()==Path(image.filepath).name.lower()]
            if matches:image.filepath=str(matches[0]);image.reload()
    picked=[]
    exclude={'Cube.145','Cube.146','Cube.155','Cube.154','HexFloor','Volume','Retopo_Mattress'}
    for o in list(scene.objects):
        if o.type not in {'MESH','CURVE'} or o.hide_render or o.hide_get() or o.name in exclude:continue
        collections=[c.name.lower() for c in o.users_collection]
        if any('bool' in c or c in ['cage','floorold','deskold','branches','pot'] or 'shoe' in c or 'bonsai' in c for c in collections):continue
        lo,hi=bounds([o]);center=(lo+hi)/2
        if not (9<=center.x<=15.8 and -4.4<=center.y<=1.3 and -.1<=center.z<=3.5):continue
        if o.name.startswith('Bolt') or max(hi-lo)<.035:continue
        dims=sorted(hi-lo)
        if dims[0]<.025 and dims[1]<.1 and dims[2]>1:continue
        picked.append(o)
    print('BEDROOM_SELECTED '+str(len(picked)),flush=True)
    # Keep Mirror reference helpers until their selected meshes are baked.
    objects=[]
    for o in picked:
        bpy.ops.object.select_all(action='DESELECT');o.hide_set(False);o.select_set(True);bpy.context.view_layer.objects.active=o
        world=o.matrix_world.copy();o.data=o.data.copy()
        bpy.ops.object.convert(target='MESH');converted=bpy.context.object
        converted.parent=None;converted.matrix_world=world
        # Clip out-of-room mirror remnants and hidden construction fragments.
        import bmesh
        bm=bmesh.new();bm.from_mesh(converted.data)
        bad=[]
        for vertex in bm.verts:
            pos=converted.matrix_world@vertex.co
            if not (9.0<=pos.x<=15.9 and -4.5<=pos.y<=1.4 and -.05<=pos.z<=3.7):bad.append(vertex)
        if bad:bmesh.ops.delete(bm,geom=bad,context='VERTS');bm.to_mesh(converted.data)
        bm.free();converted.data.validate(clean_customdata=True)
        count=triangles(converted);print('BEDROOM_CONVERT '+o.name+' '+str(count),flush=True)
        simplify(converted,2500 if o.name in {'Bed','Mattress','Cube.135','Cube.163','Cube.121'} else 900)
        objects.append(converted)
        for mesh in list(bpy.data.meshes):
            if mesh.users==0:bpy.data.meshes.remove(mesh)
    for o in list(scene.objects):
        if o not in objects:bpy.data.objects.remove(o,do_unlink=True)
    bpy.ops.mesh.primitive_plane_add(size=1,location=(12.4534,-1.6744,.10408768))
    floor=bpy.context.object;floor.dimensions=(5.81,4.936,0);floor.data.materials.append(bpy.data.materials.get('FloorHexOuter'));floor.name='Bedroom_GameFloor';objects.append(floor)
    original_triangles=sum(triangles(o) for o in objects)
    transform=Matrix.Diagonal((8/5.81,8/4.936,4/2.984,1))@Matrix.Translation(Vector((-12.4534,1.6744,-.10408768)))
    for o in objects:
        world=o.matrix_world.copy();o.parent=None;o.matrix_world=transform@world;o.animation_data_clear()
        simplify(o,max(20,int(53000*triangles(o)/max(original_triangles,1))))
    specs={
        'metal':((.32,.36,.4,1),.65,.42),'darkmetal':((.06,.075,.085,1),.65,.45),
        'paint':((.06,.13,.14,1),.48,.48),'paintlight':((.17,.24,.25,1),.5,.42),
        'plastic':((.012,.022,.028,1),.05,.58),'plasticmedium':((.06,.09,.11,1),.1,.5),
        'white':((.62,.68,.7,1),.1,.48),'copper':((.43,.16,.06,1),.7,.42),
        'bed':((.06,.22,.21,1),0,.92),'glass':((.03,.14,.19,1),.55,.18),
        'red':((.7,.015,.009,1),.1,.3),'cyan':((.015,.36,.55,1),.1,.3),
        'warm':((.7,.43,.2,1),.1,.3),'emit':((.64,.78,.82,1),.1,.3),
        'screen':((.015,.11,.16,1),.1,.4)}
    materials={}
    for name,(color,metal,rough) in specs.items():
        mat=bpy.data.materials.new('Erebus_Cabin_'+name);mat.use_nodes=True;sh=mat.node_tree.nodes.get('Principled BSDF');sh.inputs['Base Color'].default_value=color;sh.inputs['Metallic'].default_value=metal;sh.inputs['Roughness'].default_value=rough
        if name in {'red','cyan','warm','emit','screen'}:sh.inputs['Emission Color'].default_value=color;sh.inputs['Emission Strength'].default_value=1.2 if name!='screen' else .5
        mat.use_backface_culling=False;materials[name]=mat
    # Reload late too: texture archive can arrive during lengthy geometry work.
    if textures.exists():
        for image in bpy.data.images:
            if image.name not in {'MonitorDisplay.png','GrungeMap.png'}:continue
            found=next((p for p in textures.rglob('*') if p.is_file() and p.name.lower()==Path(image.filepath).name.lower()),None)
            if found:image.filepath=str(found);image.reload()
    grunge=next((i for i in bpy.data.images if i.name=='GrungeMap.png' and i.size[0]>0),None)
    if grunge:
        grunge.colorspace_settings.name='Non-Color'
        grunge=persisted_image(grunge,'bedroom-grunge',1024)
        for name in ['metal','darkmetal','paint','paintlight','copper','plasticmedium']:
            mat=materials[name];tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=grunge;mat.node_tree.links.new(tex.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'])
    for o in objects:
        if o.data.uv_layers:continue
        uv=o.data.uv_layers.new(name='GameSurfaceUV')
        for face in o.data.polygons:
            axis=max(range(3),key=lambda i:abs(face.normal[i]));axes=[i for i in range(3) if i!=axis]
            for idx in face.loop_indices:
                pos=o.matrix_world@o.data.vertices[o.data.loops[idx].vertex_index].co
                uv.data[idx].uv=(pos[axes[0]]*2,pos[axes[1]]*2)
    display=next((i for i in bpy.data.images if i.name=='MonitorDisplay.png' and i.size[0]>0),None)
    if display:
        display=persisted_image(display,'bedroom-monitor',1024)
        sh=materials['screen'].node_tree.nodes.get('Principled BSDF');tex=materials['screen'].node_tree.nodes.new('ShaderNodeTexImage');tex.image=display;materials['screen'].node_tree.links.new(tex.outputs['Color'],sh.inputs['Base Color']);materials['screen'].node_tree.links.new(tex.outputs['Color'],sh.inputs['Emission Color'])
    def family(name):
        name=name.lower()
        if 'monitor' in name or name=='news':return 'screen'
        if 'blue' in name:return 'cyan'
        if 'red' in name and ('emit' in name or 'light' in name):return 'red'
        if 'emit' in name or 'lights' in name:return 'warm' if 'green' in name or 'yellow' in name else 'emit'
        if 'glass' in name or 'mirror' in name:return 'glass'
        if name=='bed' or 'leather' in name:return 'bed'
        if 'copper' in name:return 'copper'
        if 'painted01' in name:return 'paint'
        if 'painted02' in name or 'floor' in name:return 'paintlight'
        if 'white' in name or 'paper' in name:return 'white'
        if 'plasticmedium' in name:return 'plasticmedium'
        if 'plastic' in name or 'rubber' in name or 'wire' in name:return 'plastic'
        if 'dark' in name:return 'darkmetal'
        return 'metal'
    for o in objects:
        for slot in o.material_slots:slot.material=materials[family(slot.material.name if slot.material else '')]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();room=bpy.context.object;room.name='Erebus_Crew_Cabin';objects=[room]
    simplify(room,57000)
    # A bounded final cutter opens the front doorway after removing source
    # Boolean construction trees. Cutter has only12triangles.
    bpy.ops.mesh.primitive_cube_add(size=1,location=(0,4,1.9));cutter=bpy.context.object;cutter.dimensions=(2.2,1.2,3.6);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    bpy.context.view_layer.objects.active=room;mod=room.modifiers.new('Open game doorway','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='FAST';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
    room.data.validate(clean_customdata=True)
    bpy.context.view_layer.update()
    render(objects,'bedroom',(0,3.2,1.7),(0,-3,1.6))
    bpy.ops.object.select_all(action='DESELECT');room.select_set(True);bpy.context.view_layer.objects.active=room
    bpy.ops.export_scene.gltf(filepath=str(OUT/'bedroom.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=False,export_apply=True,export_image_format='JPEG',export_jpeg_quality=90)
    lo,hi=bounds(objects)
    report={'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'bounded_source_triangles':original_triangles,'triangles':triangles(room),'bytes':(OUT/'bedroom.glb').stat().st_size,'materials':len(set(p.material_index for p in room.data.polygons)),'bounds_gltf':[[lo.x,lo.z,-hi.y],[hi.x,hi.z,-lo.y]],'floor_y':0,'entry':{'position':[0,0,-4],'width':1.9,'height':3.1},'bed_proxy':{'min':[-1.87,0,2.6],'max':[1.93,1.3,4]},'desk_proxy':{'min':[2,0,2.5],'max':[4,1.5,4]},'monitor_image_included':bool(display),'grunge_roughness_included':bool(grunge),'limitations':['Original visible base room geometry retained with bounded Mirror/Solidify; other non-destructive refinements removed and static mesh decimated; no source lights, volumes, shoes, bonsai or DAZ models.','Procedural material networks simplified into15 bounded PBR families; exact procedural scratches/cloth/transparency not preserved.','Dense GeometryNodes hex floor replaced with flat game floor; source door panels opened.','Source4.5 reads with newer-version compatibility warning under4.3; exported static derivative requires visual inspection.']}
    (OUT/'bedroom-report.json').write_text(json.dumps(report,indent=2)+'\n');print('BEDROOM_REPORT '+json.dumps(report))

def interior():
    source=ROOT/'.local/cg-props/SpaceShip.blend'
    bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False,use_scripts=False);bpy.context.view_layer.update()
    excluded={'Cube.290','Misc01.001','Misc01.002','Misc01.003','Misc01.004'}
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.visible_get() and not o.hide_render and o.name not in excluded]
    native_triangles=sum(triangles(o) for o in objects)
    for o in objects:
        world=o.matrix_world.copy();o.parent=None;o.matrix_world=world;o.animation_data_clear();o.data=o.data.copy()
        for mod in list(o.modifiers):o.modifiers.remove(mod)
    for o in list(bpy.context.scene.objects):
        if o not in objects:bpy.data.objects.remove(o,do_unlink=True)
    # Rebuild simple glTF-compatible PBR from actual authored DDS channels.
    texture_root=SOURCE/'intrepid-decoded';files=list(texture_root.rglob('*.png'))
    materials={};missing=[];images={}
    prefixes={p.name.rsplit('_',1)[0] for p in files if p.name.endswith('_Alb.png')}
    def mapped(name):
        if name in prefixes:return name
        for prefix in sorted(prefixes,key=len,reverse=True):
            if name.startswith(prefix):return prefix
        if name in {'Emergency Computer'}:return 'EmergencyComputer'
        return 'ErebusNeutral'
    for o in objects:
        for slot in o.material_slots:
            key=mapped(slot.material.name if slot.material else '')
            if key not in materials:
                mat=bpy.data.materials.new('Erebus_Intrepid_'+key);mat.use_nodes=True;shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(.15,.19,.22,1);shader.inputs['Metallic'].default_value=.5;shader.inputs['Roughness'].default_value=.6
                for suffix,socket in [('Alb','Base Color'),('N','Normal'),('M','Metallic'),('R','Roughness'),('E','Emission Color')]:
                    file=next((p for p in files if p.name==f'{key}_{suffix}.png'),None)
                    if not file:
                        if key!='ErebusNeutral' and suffix!='E':missing.append(f'{key}_{suffix}')
                        continue
                    im=bpy.data.images.load(str(file),check_existing=True)
                    if max(im.size)>512:im.scale(512,512)
                    if suffix in {'N','M','R'}:im.colorspace_settings.name='Non-Color'
                    # Keep decoded PNG path unchanged; changing a file-backed
                    # path can invalidate lazily loaded pixel data.
                    images[im.name]=im
                    tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
                    if suffix=='N':
                        normal=mat.node_tree.nodes.new('ShaderNodeNormalMap');mat.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);mat.node_tree.links.new(normal.outputs['Normal'],shader.inputs['Normal']);normal.inputs['Strength'].default_value=.65
                    else:mat.node_tree.links.new(tex.outputs['Color'],shader.inputs[socket])
                    if suffix=='E':shader.inputs['Emission Strength'].default_value=.7
                mat.use_backface_culling=False;materials[key]=mat
            slot.material=materials[key]
    floor_material=materials.get('Floor01C',next(iter(materials.values())))
    for y,depth in [(-1.225,.35),(2.275,.35),(5.775,.35),(9.2575,.315)]:
        bpy.ops.mesh.primitive_plane_add(size=1,location=(0,y,.07));patch=bpy.context.object;patch.dimensions=(2.8,depth,0);patch.data.materials.append(floor_material);patch.name='Intrepid_Threshold_FloorBridge';objects.append(patch)
    for side in [-1,1]:
        bpy.ops.mesh.primitive_plane_add(size=1,location=(side*1.75,4.025,.07));patch=bpy.context.object;patch.dimensions=(.7,1.35,0);patch.data.materials.append(floor_material);patch.name='Intrepid_SideEntry_FloorBridge';objects.append(patch)
    bpy.context.view_layer.update()
    # Original aft floor terminates atY-4.55: open onlycentralexit for runway.
    # The forward end remains open for the gameplay forge window.
    transform=Matrix.Scale(1.5,4)@Matrix.Translation(Vector((0,0,-.07)))
    for o in objects:o.matrix_world=transform@o.matrix_world
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);bpy.ops.object.join();room=bpy.context.object;room.name='Erebus_Intrepid_Station';objects=[room]
    # Clip open source surfaces deterministically. Boolean solvers leave
    # internal panels behind on this non-manifold game-art assembly.
    import bmesh
    bm=bmesh.new();bm.from_mesh(room.data)
    for axis,value in [(0,-2.075),(0,2.075),(1,-15.45),(1,-6.45),(2,.2),(2,4.2)]:
        point=Vector((0,0,0));point[axis]=value;normal=Vector((0,0,0));normal[axis]=1
        bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=point,plane_no=normal,clear_inner=False,clear_outer=False)
    bad=[face for face in bm.faces if abs(face.calc_center_median().x)<2.075-.00001 and -15.45<face.calc_center_median().y<-6.45 and .2<face.calc_center_median().z<4.2]
    bmesh.ops.delete(bm,geom=bad,context='FACES')
    loose=[v for v in bm.verts if not v.link_faces]
    if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(room.data);bm.free();room.data.validate(clean_customdata=True)
    bpy.context.view_layer.update()
    render(objects,'interior',(0,-3,1.7),(0,9,1.7))
    bpy.ops.object.select_all(action='DESELECT');room.select_set(True);bpy.context.view_layer.objects.active=room
    bpy.ops.export_scene.gltf(filepath=str(OUT/'interior.glb'),export_format='GLB',use_selection=True,export_animations=False,export_apply=True,export_yup=True,export_image_format='JPEG',export_jpeg_quality=90)
    lo,hi=bounds(objects)
    report={'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'native_visible_triangles':native_triangles,'triangles':triangles(room),'bytes':(OUT/'interior.glb').stat().st_size,'materials':len(set(p.material_index for p in room.data.polygons)),'decoded_authored_maps':len(images),'texture_cap':512,'bounds_gltf':[[lo.x,lo.z,-hi.y],[hi.x,hi.z,-lo.y]],'floor_y':0,'uniform_scale':1.5,'side_door_centers_gltf':[[-2.625,0,-6.0375],[2.625,0,-6.0375]],'side_door_panels_removed':sorted(excluded-{'Cube.290'}),'threshold_floor_bridges':6,'aft_entry_gltf':[0,0,6.825],'safe_front_inner_room_rects_gltf':[[-7.35,-8.4,-3.15,-3.675],[3.15,-8.4,7.35,-3.675]],'missing_dds_channels':missing,'limitations':['Only original visible Collection 6 assembly retained; off-scene asset libraries excluded.','Structural floors/walls are not decimated; aft central runway aperture added and side entry panels removed.','512-pixel DDS maps converted to local images; source PNG-only emissive maps/decals were absent from the DDS archive and are not reconstructed exactly.','Invalid source Locker Cube.290 below-floor transform excluded.','Collider trimesh must use the exact exported static geometry; avatar routes and closed-room door blocking require in-game QA.']}
    (OUT/'interior-report.json').write_text(json.dumps(report,indent=2)+'\n');print('INTERIOR_REPORT '+json.dumps(report))

def finish_bedroom():
    # Re-import validates triangulated geometry and bakes inherited model axes.
    # This final pass also restores floor removed by the early doorway cutter.
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(OUT/'bedroom.glb'));bpy.context.view_layer.update()
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
    worlds={o:o.matrix_world.copy() for o in objects}
    for o in objects:o.parent=None;o.matrix_world=worlds[o]
    material=next(m for m in bpy.data.materials if m.name.startswith('Erebus_Cabin_paintlight'))
    bpy.ops.mesh.primitive_plane_add(size=1,location=(0,3.7,0));patch=bpy.context.object;patch.dimensions=(2.2,.6,0);patch.data.materials.append(material);patch.name='Cabin_Entry_FloorBridge';objects.append(patch)
    bpy.context.view_layer.update();bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);bpy.ops.object.join();room=bpy.context.object;room.name='Erebus_Crew_Cabin';room.data.validate(clean_customdata=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/'bedroom.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_image_format='JPEG',export_jpeg_quality=90)
    lo,hi=bounds([room]);report=json.loads((OUT/'bedroom-report.json').read_text());report.update({'triangles':triangles(room),'bytes':(OUT/'bedroom.glb').stat().st_size,'bounds_gltf':[[lo.x,lo.z,-hi.y],[hi.x,hi.z,-lo.y]],'entry':{'position':[0,0,-4],'width':2.2,'height':3.1},'entry_floor_bridge':True,'mesh_world_transform_baked':True})
    (OUT/'bedroom-report.json').write_text(json.dumps(report,indent=2)+'\n');print('BEDROOM_FINAL '+json.dumps(report))

if __name__=='__main__':
    kind=sys.argv[-1]
    if kind=='corridor':corridor()
    elif kind=='bedroom':bedroom()
    elif kind=='interior':interior()
    elif kind=='finish-bedroom':finish_bedroom()
    else:raise ValueError('Unsupported interior kind')
