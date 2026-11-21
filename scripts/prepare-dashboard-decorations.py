"""Deterministic derivatives of the two supplied PNGs. Originals are never written."""
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image, ImageDraw, ImageChops

root = Path(__file__).resolve().parents[1]
assets = root / 'public/assets'
output = assets / 'decorations'
output.mkdir(exist_ok=True)
sources = {
    'fishing': assets / '검색창 위의 활쏘는 무사 낚시꾼.png',
    'flame': assets / '오렌지 골드 미니멀 불꽃 아이콘.png',
}
records = []
for key, source in sources.items():
    image = Image.open(source).convert('RGBA')
    # Near-transparent speckles extend almost across the canvas; preserve the
    # supplied art's RGB and meaningful anti-aliasing, without those stray pixels.
    alpha = image.getchannel('A').point(lambda value: 0 if value < 16 else value)
    if key == 'fishing':
        # Keep the original person, rod and hanging leg. Exclude the painted
        # search rectangle, water ellipse and its background, rather than redraw.
        mask = Image.new('L', image.size)
        draw = ImageDraw.Draw(mask)
        draw.rectangle((440, 55, 850, 288), fill=255)
        draw.rectangle((850, 55, 1010, 256), fill=255)
        draw.polygon([(510,280),(590,280),(542,302),(510,302)], fill=255)
        draw.polygon([(680,265),(726,266),(741,290),(753,305),(764,331),
                      (756,345),(765,370),(765,395),(749,388),(735,366),
                      (729,350),(731,337),(719,308),(700,290)], fill=255)
        alpha = ImageChops.multiply(alpha, mask)
    image.putalpha(alpha)
    bounds = alpha.getbbox()
    image = image.crop(bounds)
    # 4x+ the intended CSS display resolution, retaining transparency and hue.
    image.thumbnail((256,256) if key=='fishing' else (64,64),Image.Resampling.LANCZOS)
    target = output / ('fishing-silhouette.webp' if key=='fishing' else 'spotlight-flame.webp')
    image.save(target,'WEBP',lossless=True,method=6)
    records.append({'source':source.name,'sha256':sha256(source.read_bytes()).hexdigest(),
                    'crop':bounds,'size':image.size,'output':target.name,'bytes':target.stat().st_size})
print(json.dumps(records,ensure_ascii=True,indent=2))
