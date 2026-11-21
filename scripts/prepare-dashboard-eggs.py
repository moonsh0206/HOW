"""Crop/mask supplied art only. Never overwrite the five source PNGs."""
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image, ImageDraw, ImageChops

root=Path(__file__).resolve().parents[1]
assets=root/'public/assets'
output=assets/'decorations'
output.mkdir(exist_ok=True)
sources={
 'genji':'검색창 위에서 라면 먹는 사이보그 닌자.png',
 'ana':'후드 쓴 전술 저격수의 휴식.png',
 'sombra':'해커 실루엣과 해골 노트북.png',
 'winston':'바나나 먹는 윈스턴과 검색창.png',
}
records=[]
for key,name in sources.items():
 source=assets/name
 im=Image.open(source).convert('RGBA')
 alpha=im.getchannel('A')
 if key in ('genji','ana'):
  # Opaque subject is intact; remove the broad low-alpha halo around it.
  alpha=alpha.point(lambda value:0 if value<220 else round((value-220)*255/35))
 else:
  alpha=alpha.point(lambda value:0 if value<24 else value)
  mask=Image.new('L',im.size)
  draw=ImageDraw.Draw(mask)
  if key=='sombra':
   draw.rectangle((365,25,805,307),fill=255)
   draw.polygon([(520,295),(693,287),(740,367),(710,352),(678,324),(560,315),
                 (555,361),(551,386),(536,402),(516,431),(501,448),(475,477),
                 (451,503),(430,499),(438,478),(449,446),(459,417),(465,389),
                 (476,363),(488,332)],fill=255)
  else:
   draw.rectangle((325,40,740,352),fill=255)
   draw.polygon([(375,340),(470,343),(466,389),(451,414),(442,450),
                 (427,478),(397,479),(365,474),(341,464),(342,436),(356,401)],fill=255)
   draw.polygon([(520,340),(600,343),(599,390),(579,410),(566,440),
                 (556,470),(529,470),(507,458),(499,442),(507,410)],fill=255)
  alpha=ImageChops.multiply(alpha,mask)
 im.putalpha(alpha)
 bounds=alpha.getbbox()
 im=im.crop(bounds)
 im.thumbnail((160,160),Image.Resampling.LANCZOS)
 target=output/f'{key}-search.webp'
 im.save(target,'WEBP',lossless=True,method=6)
 records.append(dict(hero=key,source=name,sha256=sha256(source.read_bytes()).hexdigest(),
                     crop=bounds,size=im.size,output=target.name,bytes=target.stat().st_size))
report=root/'docs/qa/dashboard-eggs'
report.mkdir(parents=True,exist_ok=True)
(report/'assets.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(records,ensure_ascii=True,indent=2))
