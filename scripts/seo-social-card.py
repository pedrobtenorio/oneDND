"""Generate the site's share card with its own typography and colors."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[1]
card=Image.new('RGB',(1200,630),'#273136')
draw=ImageDraw.Draw(card)
draw.rectangle((30,30,1170,600),outline='#b28b4b',width=3)
title=ImageFont.truetype('C:/Windows/Fonts/georgiab.ttf',92)
body=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',36)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',28)
draw.text((90,115),'One D&D',font=title,fill='#fff4d9')
draw.text((90,265),'Seu compêndio de aventura',font=body,fill='#e6c789')
draw.text((90,345),'Regras · Classes · Magias · Personagens',font=body,fill='#fff4d9')
draw.text((90,495),'D&D 2024 em português · personagens até nível 8',font=small,fill='#e2cdb6')
output=root/'public/assets/seo/social-card.png';output.parent.mkdir(parents=True,exist_ok=True)
card.save(output,optimize=True)
