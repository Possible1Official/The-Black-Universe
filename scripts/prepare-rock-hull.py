"""Build coarse fallback/collision hull from the optimized Y-up GLB.
Run: blender -b --python scripts/prepare-rock-hull.py -- <repo-root>
"""
import bpy,bmesh,json,pathlib
from mathutils import Vector
import struct,sys
root=pathlib.Path(sys.argv[sys.argv.index('--')+1]);raw=(root/'.local/requested-optimized/rock.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[28+n:];a=g['accessors'][g['meshes'][0]['primitives'][0]['attributes']['POSITION']];view=g['bufferViews'][a['bufferView']];offset=view.get('byteOffset',0)+a.get('byteOffset',0);points=[Vector(struct.unpack_from('<fff',binary,offset+i*view.get('byteStride',12)))for i in range(a['count'])]
# Twenty-six broad support directions retain a small, conservative gameplay hull.
dirs=[Vector((x,y,z)).normalized()for x in [-1,0,1]for y in [-1,0,1]for z in [-1,0,1]if x or y or z];chosen={max(range(len(points)),key=lambda i:points[i].dot(d))for d in dirs}
bm=bmesh.new();vs=[bm.verts.new(points[i])for i in sorted(chosen)];bmesh.ops.convex_hull(bm,input=vs,use_existing_faces=False);bmesh.ops.triangulate(bm,faces=list(bm.faces));used=list({v for f in bm.faces for v in f.verts});used.sort(key=lambda v:tuple(v.co));ids={v:i for i,v in enumerate(used)};vertices=[round(c,6)for v in used for c in v.co];indices=[ids[v]for f in bm.faces for v in f.verts]
p=root/'src/rock-hull.ts';p.write_text('// Coarse gameplay hull derived from reviewed CGTrader rock 898927; not the stock mesh/UVs.\nexport const ROCK_HULL_VERTICES=new Float32Array('+json.dumps(vertices,separators=(',',':'))+');\nexport const ROCK_HULL_INDICES='+json.dumps(indices,separators=(',',':'))+';\n')
print('HULL_AUDIT',len(used),len(indices)//3)

for path in [root/'.local/requested-optimized/rock-report.json',root/'public/assets/requested/rock-conversion.json']:
 report=json.loads(path.read_text());report['collision_hull']={'vertices':len(used),'triangles':len(indices)//3,'method':'26 support directions, coarse convex hull; same data for fallback and Rapier'};path.write_text(json.dumps(report,indent=2)+'\n')
