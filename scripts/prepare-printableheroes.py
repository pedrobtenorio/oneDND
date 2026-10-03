"""Import public PrintableHeroes PDFs. Requires Pillow and pypdf.

Originals and review contact sheets stay in the temporary directory.
Only the free attachments explicitly listed in the source manifest are fetched.
"""
import argparse
import json
import tempfile
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image, ImageDraw
from pypdf import PdfReader, PageObject
from pypdf.generic import NameObject
import pypdfium2 as pdfium
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(tempfile.gettempdir()) / 'dnd-printableheroes'
CACHE.mkdir(exist_ok=True)
SOURCES = json.loads((ROOT/'scripts/printableheroes-sources.json').read_text(encoding='utf-8'))
catalog_sources = ROOT/'scripts/printableheroes-catalog-sources.json'
if catalog_sources.exists():
    SOURCES += json.loads(catalog_sources.read_text(encoding='utf-8'))

def download(entry):
    path = CACHE / (entry['id']+'.'+entry.get('extension','pdf'))
    if not path.exists():
        url = entry['url'] if 'url' in entry else f"https://www.patreon.com/file?h=7956662&m={entry['file']}"
        req = urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req,timeout=60) as response:
            data = response.read()
        if not data.startswith((b'%PDF',b'PK')):
            raise ValueError(f"Invalid attachment: {entry['id']}")
        path.write_bytes(data)
    return path

def extract(entry):
    path = CACHE/(entry['id']+'.'+entry.get('extension','pdf'))
    documents = [(path.name,path.read_bytes())]
    if path.suffix == '.zip':
        with zipfile.ZipFile(path) as archive:
            documents = [(name,archive.read(name)) for name in archive.namelist() if name.lower().endswith('.pdf') and 'free' in name.lower()]
    import io
    found = []
    for doc_index,(name,data) in enumerate(documents):
        reader = PdfReader(io.BytesIO(data))
        (CACHE/(entry['id']+f'-{doc_index}-text.txt')).write_text('\n'.join(p.extract_text() for p in reader.pages),encoding='utf-8')
        for page_index,page in enumerate(reader.pages):
            seen = set()
            for annotation in page.get('/Annots',[]):
                annotation = annotation.get_object()
                field = str(annotation.get('/T',''))
                if not field or any(term in field.lower() for term in ['base','border','select','remove','add','patreon','tumblr','bw','label','title','logo']):
                    continue
                appearance = annotation.get('/AP',{}).get('/N')
                if appearance is None:
                    continue
                appearance = appearance.get_object()
                if not hasattr(appearance,'get') or '/Resources' not in appearance:
                    continue
                blank = PageObject.create_blank_page(width=500,height=500)
                blank[NameObject('/Resources')] = appearance['/Resources']
                for index,item in enumerate(blank.images):
                    image = item.image.convert('RGBA')
                    if image.width<80 or image.height<160:
                        continue
                    import hashlib,re
                    digest = hashlib.sha256(image.tobytes()).hexdigest()
                    if digest in seen:
                        continue
                    seen.add(digest)
                    image_id = f"{entry['id']}-{doc_index}-{page_index}-"+re.sub(r'[^a-zA-Z0-9_-]','-',field)
                    image.save(CACHE/(image_id+'.png'))
                    found.append((image_id,image))
            for index,item in enumerate(page.images):
                image = item.image.convert('RGBA')
                if image.width < 80 or image.height < 160:
                    continue
                image_id = f"{entry['id']}-{doc_index}-{page_index}-{index}"
                image.save(CACHE/(image_id+'.png'))
                found.append((image_id,image))
        if not found:
            document = pdfium.PdfDocument(data)
            for page_index in range(len(document)):
                image = document[page_index].render(scale=4).to_pil().convert('RGBA')
                image_id = f"{entry['id']}-{doc_index}-{page_index}-page"
                image.save(CACHE/(image_id+'.png'))
                found.append((image_id,image))
    return found

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--download',action='store_true')
    args = parser.parse_args()
    if args.download:
        with ThreadPoolExecutor(max_workers=4) as pool:
            for result in pool.map(download,SOURCES):
                print('Downloaded',result.name,flush=True)
    extracted = []
    for entry in SOURCES:
        found = extract(entry)
        sheet = Image.new('RGB',(5*240,((len(found)+4)//5)*320),'#43524c')
        draw = ImageDraw.Draw(sheet)
        for index,(image_id,image) in enumerate(found):
            extracted.append({'image':image_id,'source':entry})
            image.thumbnail((230,280))
            x,y = (index%5)*240,(index//5)*320
            sheet.paste(image,(x+(240-image.width)//2,y),image)
            draw.text((x+3,y+285),image_id,fill='white')
        if found:
            sheet.save(CACHE/(entry['id']+'-sheet.jpg'))
        print(entry['id'],len(found),flush=True)
    (CACHE/'extracted.json').write_text(json.dumps(extracted,ensure_ascii=False,indent=2),encoding='utf-8')
