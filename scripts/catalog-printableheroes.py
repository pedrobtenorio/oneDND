"""Crop extracted PrintableHeroes artwork and generate the portrait catalog.

Uses original PDF transparency; does not generate or repaint the illustrations.
"""
import hashlib
import json
import re
import tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(tempfile.gettempdir())/'dnd-printableheroes'
entries = json.loads((CACHE/'extracted.json').read_text(encoding='utf-8'))
entries.sort(key=lambda entry:(0 if 'miniId' in entry['source'] else 1,entry['image']))
ORIGINS = [('goliath','golias'),('aasimar','aasimar'),('dragonborn','draconato'),('DB_','draconato'),('tiefling','tiefling'),('TP_','tiefling'),('dwarf','anao'),('dwarven','anao'),('duergar','anao'),('gnome','gnomo'),('halfling','halfling'),('half-elf','elfo'),('HECF','elfo'),('elf','elfo'),('half-orc','orc'),('orc','orc'),('human','humano')]
ORIGIN_NAMES = {'humano':('humano','humana'),'elfo':('elfo','elfa'),'anao':('anão','anã'),'orc':('orc','orc'),'gnomo':('gnomo','gnoma'),'halfling':('pequenino','pequenina'),'draconato':('draconato','draconata'),'tiefling':('tiferino','tiferina'),'aasimar':('aasimar','aasimar'),'golias':('golias','golias')}
ROLES = [
 ('paladin','Paladino','Paladina',['paladino','guerreiro']),
 ('knight','Cavaleiro','Cavaleira',['guerreiro','paladino']),
 ('cleric','Clérigo','Clériga',['clerigo']),
 ('druid','Druida','Druida',['druida']),
 ('ranger','Guardião','Guardiã',['guardiao']),
 ('scout','Batedor','Batedora',['guardiao','ladino']),
 ('rogue','Ladino','Ladina',['ladino']),
 ('assassin','Assassino','Assassina',['ladino','guardiao']),
 ('swashbuckler','Espadachim','Espadachim',['ladino','bardo','guerreiro']),
 ('monk','Monge','Monja',['monge']),
 ('bard','Bardo','Barda',['bardo']),
 ('sorcerer','Feiticeiro','Feiticeira',['feiticeiro']),
 ('wizard','Mago','Maga',['mago']),
 ('mage','Mago','Maga',['mago']),
 ('necromancer','Necromante','Necromante',['mago','bruxo']),
 ('sigilist','Arcanista','Arcanista',['mago']),
 ('elementalist','Elementalista','Elementalista',['feiticeiro','mago']),
 ('warlock','Bruxo','Bruxa',['bruxo']),
 ('hexblade','Bruxo da lâmina','Bruxa da lâmina',['bruxo','guerreiro']),
 ('diabolist','Ocultista','Ocultista',['bruxo','mago']),
 ('barbarian','Bárbaro','Bárbara',['barbaro']),
 ('berserker','Berserker','Berserker',['barbaro','guerreiro']),
 ('tribal','Combatente tribal','Combatente tribal',['barbaro','guardiao']),
 ('brawler','Lutador','Lutadora',['monge','barbaro','guerreiro']),
 ('warrior','Guerreiro','Guerreira',['guerreiro']),
 ('fighter','Guerreiro','Guerreira',['guerreiro']),
 ('soldier','Soldado','Soldada',['guerreiro']),
 ('guard','Sentinela','Sentinela',['guerreiro','paladino']),
 ('militia','Miliciano','Miliciana',['guerreiro','guardiao']),
 ('artificer','Artífice','Artífice',['mago','guerreiro']),
 ('alchemist','Alquimista','Alquimista',['mago','druida']),
 ('apothecary','Herbalista','Herbalista',['druida','clerigo']),
 ('shaman','Xamã','Xamã',['druida','clerigo']),
 ('cultist','Cultista','Cultista',['bruxo','clerigo']),
 ('bandit','Bandido','Bandida',['ladino','guerreiro']),
 ('hunter','Explorador','Exploradora',['guardiao','ladino']),
 ('wanderer','Andarilho','Andarilha',['guardiao','monge']),
 ('merchant','Mercador','Mercadora',['bardo','ladino']),
 ('noble','Nobre','Nobre',['bardo','paladino']),
 ('blacksmith','Ferreiro','Ferreira',['guerreiro','barbaro']),
 ('barkeep','Taverneiro','Taverneira',['bardo','guerreiro']),
 ('chronicler','Cronista','Cronista',['bardo','mago']),
 ('gunslinger','Pistoleiro','Pistoleira',['guerreiro','guardiao']),
]

def metadata(entry):
    source = entry['source']
    field = entry['image'].split('-0-0-',1)[-1]
    name = source.get('name',source['id'])
    if 'fe_01' in field.lower() or 'badger' in field.lower():
        return None
    role_text = name.lower()
    origin_text = name+' '+field
    female = any(tag in ('Female','Woman') for tag in source.get('tags',[]))
    if 'Goliath_Barbarian_02' in field or 'HECF' in field or 'ElfDruidF' in field or 'HTF_' in field or 'BanditFF' in field:
        female = True
    if 'Goliath_Barbarian_01' in field:
        female = False
    if source.get('miniId') == 15:
        female = False
        role_text = 'warlock'
    if source.get('miniId') == 8:
        female = 'Warrior_01' in field
    # The older party PDFs share generic field names: inspect their exact figure.
    if source['id'].startswith('dragonborn-set-1') or 'Dragonborn_PC_01' in source.get('fileName',''):
        role_text = {'01':'barbarian','02':'bard','03':'cleric'}.get(field[-2:],'warrior')
        origin_text = 'dragonborn';female=False
    elif source['id'].startswith('dragonborn-set-2') or 'Dragonborn_PC_02' in source.get('fileName',''):
        role_text = {'01':'paladin','02':'rogue','03':'sorcerer'}.get(field[-2:],'warrior')
        origin_text = 'dragonborn';female=False
    elif 'Heroes_Set' in source.get('fileName','') or 'Hero_Re-Release' in source.get('fileName','') or source['id'].startswith('heroes-set'):
        female = 'ElfDruidF' in field
        field_roles = [('Halfling','halfling rogue'),('Dwarf','dwarf wizard'),('ElfRanger','elf ranger'),('DB_','dragonborn paladin'),('HW','human wizard'),('ElfDruid','elf druid'),('EM_','elf monk'),('TP_','tiefling paladin')]
        for marker,value in field_roles:
            if marker in field:
                role_text=origin_text=value
                break
    elif source['id']=='gnomes' or 'Gnomes_PC' in source.get('fileName',''):
        role_text=origin_text=field
        female='Cleric' in field
    elif source['id']=='human-merchant' or 'Human_Merchant' in source.get('fileName',''):
        role_text = 'bandit' if 'Bandit' in field else 'merchant'
        origin_text='human'
        female = 'BanditFF' in field
    elif 'FE_01' in field:
        return None
    origin = next((value for marker,value in ORIGINS if marker.lower() in origin_text.lower()),None)
    if origin is None:
        return None
    role = next((role for role in ROLES if role[0] in role_text.lower()),('', 'Aventureiro','Aventureira',['bardo','ladino']))
    title = role[2 if female else 1]+' '+ORIGIN_NAMES[origin][1 if female else 0]
    return {'name':title,'origin':origin,'appearance':'feminina' if female else 'masculina','styles':role[3]}

def torso(image, crop_fraction=.66):
    if image.width/image.height > 0.9:
        raise ValueError('Page or multi-figure layout requires a dedicated crop')
    image = image.convert('RGBA')
    a = np.array(image)
    mask = (a[:,:,3]>100)&(np.ptp(a[:,:,:3].astype(int),axis=2)>12)
    ys,xs = np.where(mask)
    if len(xs)<100 or mask.sum()/max(1,(a[:,:,3]>100).sum()) < .10:
        raise ValueError('Monochrome figure or no character artwork')
    # The extracted standee widgets contain an inverted back above the upright
    # front. Their midpoint is the fold line, even when weapons cross it.
    image=image.crop((4,int(image.height*.505),image.width-4,int(image.height*.91)))
    a=np.array(image)
    mask=(a[:,:,3]>100)&(np.ptp(a[:,:,:3].astype(int),axis=2)>12)
    ys,xs=np.where(mask)
    padding=max(6,int(image.width*.025))
    image=image.crop((max(0,int(xs.min())-padding),max(0,int(ys.min())-padding),min(image.width,int(xs.max())+padding+1),min(image.height,int(ys.max())+padding+1)))
    image=image.crop((0,0,image.width,int(image.height*crop_fraction)))
    image.thumbnail((380,400),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(400,420))
    canvas.alpha_composite(image,((400-image.width)//2,420-image.height))
    return canvas

portraits=[];provenance=[];skipped=[];digests=set();names={};previews=[]
for entry in entries:
    info=metadata(entry)
    if info is None:
        skipped.append({'image':entry['image'],'reason':'Other creature or unclassified origin'})
        continue
    try:
        # The gnome cleric holds her weapon far above her head; keep more of
        # that miniature so the torso is not lost below the raised hammer.
        image=torso(Image.open(CACHE/(entry['image']+'.png')), .88 if 'gnome-cleric' in entry['image'].lower() else .66)
    except ValueError as error:
        skipped.append({'image':entry['image'],'reason':str(error)})
        continue
    digest=hashlib.sha256(image.tobytes()).hexdigest()
    if digest in digests:
        skipped.append({'image':entry['image'],'reason':'Duplicate artwork'})
        continue
    digests.add(digest)
    portrait_id='printableheroes-'+entry['image'].lower()
    names[info['name']]=names.get(info['name'],0)+1
    if names[info['name']]>1:
        info['name']+=' · '+str(names[info['name']])
    image.save(ROOT/'public/assets/art'/(portrait_id+'.webp'),'WEBP',lossless=True)
    portraits.append({'id':portrait_id,**info})
    source=entry['source']
    provenance.append({'id':portrait_id,'name':info['name'],'source':source.get('url',f"https://www.patreon.com/file?h=7956662&m={source['file']}" if 'file' in source else ''),'page':f"https://printableheroes.com/minis/{source['miniId']}" if 'miniId' in source else 'https://www.patreon.com/PrintableHeroes/posts/free-paper-7956662','field':entry['image']})
    previews.append((image,info['name'],portrait_id))

catalog="// Generated by scripts/catalog-printableheroes.py.\nimport type { CharacterPortrait } from './portrait-catalog';\n\nexport const PRINTABLEHEROES_PORTRAITS: CharacterPortrait[] = "+json.dumps(portraits,ensure_ascii=False,indent=2)+';\n'
(ROOT/'src/app/utils/printableheroes-portraits.ts').write_text(catalog,encoding='utf-8')
(ROOT/'public/assets/art/printableheroes-sources.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2),encoding='utf-8')
(CACHE/'portrait-review.json').write_text(json.dumps({'added':len(portraits),'skipped':skipped,'portraits':portraits},ensure_ascii=False,indent=2),encoding='utf-8')
for start in range(0,len(previews),48):
    batch=previews[start:start+48]
    sheet=Image.new('RGB',(8*180,((len(batch)+7)//8)*230),'#43524c');draw=ImageDraw.Draw(sheet)
    for index,(image,name,portrait_id) in enumerate(batch):
        thumb=image.copy();thumb.thumbnail((170,190));x=(index%8)*180;y=(index//8)*230
        sheet.paste(thumb,(x+(180-thumb.width)//2,y),thumb)
        draw.text((x+4,y+192),f'{start+index}: '+name,fill='white')
    sheet.save(CACHE/f'portraits-{start//48}.jpg')
print('Added',len(portraits),'portraits; skipped',len(skipped))
