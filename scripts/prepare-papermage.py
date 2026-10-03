"""Prepare approved Paper Mage PDF miniatures as transparent torso portraits.

Requires Pillow and pypdf. Originals stay in the system temporary directory.
Run with --download to fetch the public PDF attachments listed in the manifest.
"""
import argparse
import json
import tempfile
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from collections import deque
from PIL import Image, ImageDraw
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(tempfile.gettempdir()) / 'dnd-papermage'
CACHE.mkdir(exist_ok=True)
SOURCES = json.loads((ROOT / 'scripts/papermage-sources.json').read_text(encoding='utf-8'))

def download(entry):
    path = CACHE / (entry['id'] + '.pdf')
    if not path.exists():
        url = f"https://www.patreon.com/file?h={entry['post']}&m={entry['file']}"
        req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60) as response:
            data = response.read()
        if not data.startswith(b'%PDF'):
            raise ValueError(f"Not a PDF: {entry['id']}")
        path.write_bytes(data)
    return entry['id']

def remove_background(image):
    image = image.convert('RGBA')
    w, h = image.size
    pixels = image.load()
    seen = set()
    queue = deque([(x, y) for x in range(w) for y in (0,h-1)] + [(x,y) for y in range(h) for x in (0,w-1)])
    while queue:
        x,y = queue.popleft()
        if (x,y) in seen:
            continue
        seen.add((x,y))
        r,g,b,a = pixels[x,y]
        # White paper and the light gray cutting guide, connected to the outside.
        if not (min(r,g,b) >= 245 or (min(r,g,b) >= 145 and max(r,g,b)-min(r,g,b) <= 3)):
            continue
        pixels[x,y] = (r,g,b,0)
        queue.extend((nx,ny) for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)) if 0<=nx<w and 0<=ny<h)
    # Remove white paper pockets enclosed by a bow, staff or wings.
    for y in range(h):
        for x in range(w):
            r,g,b,a = pixels[x,y]
            if min(r,g,b) >= 250 and max(r,g,b)-min(r,g,b) <= 3:
                pixels[x,y] = (r,g,b,0)
    # Keep the figure; discard disconnected cutting marks and fold lines.
    visited = set()
    components = []
    for y in range(h):
        for x in range(w):
            if pixels[x,y][3] == 0 or (x,y) in visited:
                continue
            component = []
            pending = [(x,y)]
            visited.add((x,y))
            while pending:
                cx,cy = pending.pop()
                component.append((cx,cy))
                for nx,ny in ((cx-1,cy),(cx+1,cy),(cx,cy-1),(cx,cy+1)):
                    if 0<=nx<w and 0<=ny<h and (nx,ny) not in visited and pixels[nx,ny][3]:
                        visited.add((nx,ny))
                        pending.append((nx,ny))
            components.append(component)
    if not components:
        raise ValueError('Empty figure')
    keep = set(max(components, key=len))
    for component in components:
        if component[0] not in keep:
            for x,y in component:
                pixels[x,y] = (0,0,0,0)
    return image.crop(image.getbbox())

def prepare(entry):
    reader = PdfReader(CACHE / (entry['id']+'.pdf'))
    images = [item for page in reader.pages for item in page.images]
    if not images:
        raise ValueError(f"No miniature row: {entry['id']}")
    source = next(item for item in images if item.name == entry.get('image', images[0].name)).image.convert('RGB')
    source.save(CACHE / (entry['id']+'-row.png'))
    box = entry.get('box', [0,0,1/3,1])
    figure = remove_background(source.crop(tuple(int(v*s) for v,s in zip(box,[source.width,source.height,source.width,source.height]))))
    fraction = entry.get('torso', 0.64)
    torso = figure.crop((0,0,figure.width,int(figure.height*fraction)))
    torso.thumbnail((380,400), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (400,420))
    canvas.alpha_composite(torso, ((400-torso.width)//2,420-torso.height))
    target = ROOT / 'public/assets/art' / ('papermage-'+entry['id']+'.webp')
    canvas.save(target, 'WEBP', lossless=True)
    return canvas

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--download', action='store_true')
    args = parser.parse_args()
    if args.download:
        with ThreadPoolExecutor(max_workers=4) as pool:
            for result in pool.map(download, SOURCES):
                print('Downloaded',result,flush=True)
    sheet = Image.new('RGB', (6*230, ((len(SOURCES)+5)//6)*260), '#43524c')
    draw = ImageDraw.Draw(sheet)
    for i, entry in enumerate(SOURCES):
        canvas = prepare(entry)
        preview = canvas.copy()
        preview.thumbnail((220,225))
        x,y = (i%6)*230, (i//6)*260
        sheet.paste(preview,(x+(230-preview.width)//2,y),preview)
        draw.text((x+5,y+230),entry['id'],fill='white')
        print('Prepared',entry['id'],flush=True)
    sheet.save(CACHE / 'contact-sheet.jpg')
    portraits = [{key:entry[key] for key in ('name','origin','styles','appearance')} | {'id':'papermage-'+entry['id']} for entry in SOURCES]
    catalog = "// Generated by scripts/prepare-papermage.py.\nimport type { CharacterPortrait } from './portrait-catalog';\n\nexport const PAPERMAGE_PORTRAITS: CharacterPortrait[] = " + json.dumps(portraits, ensure_ascii=False, indent=2) + ';\n'
    (ROOT / 'src/app/utils/papermage-portraits.ts').write_text(catalog, encoding='utf-8')
    (ROOT / 'public/assets/art/papermage-sources.json').write_text(json.dumps(SOURCES, ensure_ascii=False, indent=2), encoding='utf-8')
