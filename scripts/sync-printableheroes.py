"""Collect free character PDFs from PrintableHeroes' public catalog API.

No account, cookies or paid tier is used. Only tier 0 files are downloaded.
"""
import json
import re
import tempfile
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(tempfile.gettempdir())/'dnd-printableheroes'
CACHE.mkdir(exist_ok=True)
API = 'https://api.printableheroes.com'

def fetch(url):
    req = urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
    with urllib.request.urlopen(req,timeout=45) as response:
        return response.read()

catalog_path = CACHE/'catalog.json'
if not catalog_path.exists():
    catalog_path.write_bytes(fetch(API+'/api/minis/getall?languageKey=en-US'))
catalog = json.loads(catalog_path.read_text(encoding='utf-8-sig'))
species = re.compile(r'^(Human|Half-Elf|Elf|Dwarf|Dwarven|Halfling|Gnome|Goliath|Tiefling|Dragonborn|Aasimar|Half-Orc|Orc)\b',re.I)
excluded = re.compile(r'zombie|skeleton|ghost|vampire|ghoul|werewolf|werebear|wight|lich|statue|token|corpse|specter|spectre|revenant|mummy',re.I)
candidates = [mini for mini in catalog if mini['MinTier']<=0 and ((species.search(mini['Name']) and not excluded.search(mini['Name'])) or mini['Name'] in ['Heroes Party','Heroes Set'])]

def files_for(mini):
    path = CACHE/f"files-{mini['Id']}.json"
    if not path.exists():
        path.write_bytes(fetch(API+f"/api/minifiles/get?miniId={mini['Id']}"))
    files = json.loads(path.read_text(encoding='utf-8-sig'))
    return mini,[file for file in files.get('0',[]) if file['FileName'].lower().endswith('.pdf')]

sources = {}
failures = []
with ThreadPoolExecutor(max_workers=4) as pool:
    futures = {pool.submit(files_for,mini):mini for mini in candidates}
    for future in as_completed(futures):
        mini = futures[future]
        try:
            _,files = future.result()
            for file in files:
                name = file['FileName']
                if name not in sources or mini['Id'] < sources[name]['miniId']:
                    sources[name] = {'id':'mini-'+str(mini['Id']),'miniId':mini['Id'],'name':mini['Name'],'fileName':name,'tags':[tag['Name'] for tag in mini['Tags']], 'url':API+'/files?'+urllib.parse.urlencode({'mini_id':mini['Id'],'tier':0,'file_name':name})}
        except Exception as error:
            failures.append({'miniId':mini['Id'],'error':str(error)})
print('Candidates',len(candidates),'Unique free PDFs',len(sources),flush=True)
from collections import Counter
import hashlib
id_counts = Counter(source['id'] for source in sources.values())
for source in sources.values():
    if id_counts[source['id']] > 1:
        source['id'] += '-'+hashlib.sha256(source['fileName'].encode()).hexdigest()[:8]

def download(source):
    path = CACHE/(source['id']+'.pdf')
    if not path.exists():
        data = fetch(source['url'])
        if not data.startswith(b'%PDF'):
            raise ValueError('Response is not a PDF')
        path.write_bytes(data)
    return source

downloaded = []
with ThreadPoolExecutor(max_workers=4) as pool:
    futures = {pool.submit(download,source):source for source in sources.values()}
    for future in as_completed(futures):
        source = futures[future]
        try:
            downloaded.append(future.result())
            print('Downloaded',source['id'],source['name'],flush=True)
        except Exception as error:
            failures.append({'miniId':source['miniId'],'error':str(error)})
downloaded.sort(key=lambda source:source['miniId'])
(ROOT/'scripts/printableheroes-catalog-sources.json').write_text(json.dumps(downloaded,ensure_ascii=False,indent=2),encoding='utf-8')
(CACHE/'sync-report.json').write_text(json.dumps({'candidates':len(candidates),'downloaded':len(downloaded),'failures':failures},ensure_ascii=False,indent=2),encoding='utf-8')
print('Finished',len(downloaded),'PDFs;',len(failures),'failures',flush=True)
