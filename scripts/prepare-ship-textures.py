"""Offline bounded PBR-map derivatives before Blender decoding; requires Pillow/NumPy.
python scripts/prepare-ship-textures.py <extracted Spaceship directory>
Raw maps/private derivatives never enter the public repository.
"""
from pathlib import Path
import sys
from PIL import Image
import numpy as np
src=Path(sys.argv[1]).resolve();out=Path(__file__).resolve().parent.parent/'.local/requested-optimized/ship-textures'
count=0
for path in sorted((src/'Texture').rglob('*.png')):
 target=out/path.relative_to(src);target.parent.mkdir(parents=True,exist_ok=True)
 with Image.open(path) as original:
  if original.mode.startswith('I;16') or original.mode=='I':
   pixels=np.asarray(original,dtype=np.uint32);image=Image.fromarray(np.clip(pixels/257,0,255).astype(np.uint8),'L')
  else:image=original.convert('RGBA' if original.mode=='RGBA' else 'RGB')
  limit=1024 if 'Base_Color' in path.name and path.parent.name.lower() in ['main','back_hull','hull','front_deck','deck'] else 512
  image.thumbnail((limit,limit),Image.Resampling.LANCZOS);image.save(target,optimize=True)
 count+=1
print('Bounded source map derivatives:',count)
