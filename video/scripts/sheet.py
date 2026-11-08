"""Contact sheet of preview stills: python3 scripts/sheet.py <dir>"""
import glob, sys
from PIL import Image
d = sys.argv[1]
fs = sorted(glob.glob(f"{d}/t*.jpg"), key=lambda f: float(f.split("/t")[-1][:-4].replace("_", ".")))
ims = [Image.open(f).resize((640, 360)) for f in fs]
rows = (len(ims) + 2) // 3
sheet = Image.new("RGB", (640 * 3, 360 * rows))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % 3) * 640, (i // 3) * 360))
sheet.save(f"{d}/sheet.jpg")
