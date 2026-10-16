"""Prepare reviewed rock maps; run before prepare-rock.py using normal Python.
python scripts/prepare-rock-maps.py <repo-root>; requires Pillow and numpy.
"""
from PIL import Image
import numpy as np,pathlib,sys,json,hashlib
root=pathlib.Path(sys.argv[1]);src=root/'.local/cg-props/rock-source';out=root/'.local/requested-optimized'
def load(s):return Image.open(src/('rock_low_'+s+'.png')).convert('RGB').resize((512,512),Image.Resampling.LANCZOS)
load('Base_Color').save(out/'rock-base.png',optimize=True)
n=np.asarray(load('Normal_DirectX'),dtype=np.float32)/127.5-1;n[:,:,1]*=-1;n/=np.maximum(np.linalg.norm(n,axis=2,keepdims=True),1e-8);Image.fromarray(np.clip((n+1)*127.5,0,255).round().astype('uint8')).save(out/'rock-normal.png',optimize=True)
orm=np.stack([np.asarray(load(s))[:,:,0]for s in ['Mixed_AO','Roughness','Metallic']],axis=-1);Image.fromarray(orm).save(out/'rock-orm.png',optimize=True)
audit={'source_images':{p.name:{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':list(Image.open(p).size)}for p in src.glob('*.png')},'output_images':{p.name:{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':list(Image.open(p).size)}for p in out.glob('rock-*.png')if p.name in ['rock-base.png','rock-normal.png','rock-orm.png']}}
(root/'public/assets/requested/rock-map-conversion.json').write_text(json.dumps(audit,indent=2)+'\n')
