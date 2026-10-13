"""Bounded local asset acquisition using pinned MixamoHarvester; never ships credentials."""
import argparse
import importlib.util
import os
import re
import time
from pathlib import Path
import subprocess
import sys

REVISION = '0f9a38aa15a79110016a0a1df15f0863c8dd9e12'
ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--character', help='Approved Mixamo character ID')
parser.add_argument('--motion', action='append', default=[], help='Exact motion name; repeat for idle/walk')
parser.add_argument('--catalog', action='store_true', help='List the first catalog page without exporting')
args = parser.parse_args()
token = os.environ.get('MIXAMO_BEARER_TOKEN', '').strip()
if not token:
    sys.exit('Set MIXAMO_BEARER_TOKEN in your local process; do not save it in Git.')
if not args.catalog and (not args.character or not args.motion or len(args.motion)>4):
    sys.exit('Select one character and 1–4 exact motion names; bulk harvesting is intentionally disabled.')
if any(not re.fullmatch(r'[A-Za-z0-9 _-]{1,64}', m) for m in args.motion):
    sys.exit('Motion names must be simple catalog labels without path separators.')
checkout = ROOT / '.local' / 'MixamoHarvester'
checkout.parent.mkdir(exist_ok=True)
if not checkout.exists():
    subprocess.run(['git','clone','https://github.com/paulpierre/MixamoHarvester.git',str(checkout)],check=True)
subprocess.run(['git','-C',str(checkout),'checkout','--detach',REVISION],check=True,stdout=subprocess.DEVNULL)
spec = importlib.util.spec_from_file_location('harvester',checkout/'mixamo_harvester.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
# Upstream functions are used directly; its token-file and unbounded main() paths are not invoked.
module.get_bearer_token = lambda: token
module.MAX_THREADS = 1
# Bound HTTP requests; replace upstream's unbounded monitor with a deadline.
original_get, original_post = module.requests.get, module.requests.post
module.requests.get = lambda *a, **kw: original_get(*a, **{'timeout':30, **kw})
module.requests.post = lambda *a, **kw: original_post(*a, **{'timeout':30, **kw})
def bounded_monitor(bearer_token, character_id):
    deadline = time.monotonic() + 180
    while time.monotonic() < deadline:
        r = module.requests.get(f'{module.BASE_URL}/characters/{character_id}/monitor', headers={'Authorization':f'Bearer {bearer_token}','X-Api-Key':'mixamo2'})
        r.raise_for_status()
        data = r.json()
        if data.get('status') == 'completed': return data['job_result']
        if data.get('status') == 'failed': raise RuntimeError('Export failed')
        time.sleep(5)
    raise TimeoutError('Mixamo export polling deadline')
module.monitor_export_progress = bounded_monitor
output = ROOT / '.local' / 'mixamo-assets'
output.mkdir(exist_ok=True)
os.chdir(output)
try:
    if args.catalog:
        response = module.requests.get(f'{module.BASE_URL}/products?page=1&limit=96&type=Character',headers={'Authorization':f'Bearer {token}','X-Api-Key':'mixamo2'})
        response.raise_for_status()
        for character in response.json().get('results',[]):
            print(character.get('id'),character.get('name'))
    else:
        # First export the skin using the upstream export/monitor/download operations.
        skin = module.requests.post(f'{module.BASE_URL}/animations/export', headers={'Authorization':f'Bearer {token}','X-Api-Key':'mixamo2'}, json={'character_id':args.character,'gms_hash':[], 'preferences':{'format':'fbx7','skin':'true','fps':'30','reducekf':'0'}, 'product_name':args.character,'type':'Character'})
        skin.raise_for_status()
        skin_url = module.monitor_export_progress(token,args.character)
        module.download_animation(skin_url,str(output),'character.fbx',args.character)
        found = set()
        for page in range(1,31):
            motions = module.get_animation_list(token,page).get('results',[])
            if not motions: break
            for motion in motions:
                if motion.get('name') in args.motion and motion['name'] not in found:
                    module.process_animation(token,args.character,motion,str(output),{})
                    expected=output/f"{motion['name']}_{args.character}.fbx"
                    if not expected.exists(): raise RuntimeError('No downloaded animation output')
                    found.add(motion['name'])
            if len(found)==len(set(args.motion)): break
        missing=set(args.motion)-found
        if missing: sys.exit('Requested motions not located: '+', '.join(sorted(missing)))
        print('Acquisition finished. Verify actual FBX outputs, terms and provenance before conversion/publication.')
except Exception as exc:
    # Avoid exception bodies or URLs that could include credentials.
    sys.exit(f'Asset acquisition failed ({type(exc).__name__}). Check service availability and authentication locally.')
