# Review-only: builds output/sheets/char_ai_vs_ref.jpg (reference | painted). Run from film/ after rendering
#   node render.mjs --soft-gl --loop=ai_cmp_chibi|ai_cmp_full|ai_cmp_fullface --sheet=0.4 --cols=1 --w=1920 --out=out/<loop>.jpg
# Review-only comparison sheet: reference | painted, same scale (not used in the film).
from PIL import Image, ImageDraw, ImageFont
REF = '/home/user/The-Disease-Called-AI/docs/reference/'
rc = Image.open(REF + 'ai_character_reference.webp').convert('RGB')
rf = Image.open(REF + 'ai_character_reference_full.png').convert('RGB')
pc = Image.open('out/ai_cmp_chibi.jpg').convert('RGB').crop((960, 100, 960 + 910, 100 + 941))
pf = Image.open('out/ai_cmp_full.jpg').convert('RGB').crop((960, 0, 960 + 800, 1080))
pff = Image.open('out/ai_cmp_fullface.jpg').convert('RGB')
rf2 = rf.crop((280, 0, 680, 540)).resize((800, 1080), Image.LANCZOS)
H = 860
def fit(im, h): return im.resize((round(im.size[0] * h / im.size[1]), h), Image.LANCZOS)
A = [fit(rc, H), fit(pc, H), fit(rf2, H), fit(pf, H)]
# faces: chibi face box and full face box (5x)
cf_r = rc.crop((200, 290, 600, 600)); cf_p = pc.crop((200, 290, 600, 600))
ff_r = rf.crop((420, 25, 520, 110)).resize((500, 425), Image.LANCZOS)
cx, cy = 960, 540   # the full head centre (475, 70) lands at the frame centre in ai_cmp_fullface
ff_p = pff.crop((cx - 275, cy - 225, cx + 225, cy + 200))
FH = 420
B = [fit(cf_r, FH), fit(cf_p, FH), fit(ff_r, FH), fit(ff_p, FH)]
W = max(sum(a.size[0] for a in A), sum(b.size[0] for b in B)) + 50
o = Image.new('RGB', (W, H + FH + 90), (246, 243, 236)); d = ImageDraw.Draw(o)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22)
except Exception: font = None
x = 10
for i, a in enumerate(A):
    o.paste(a, (x, 40)); d.text((x + 8, 10), ['chibi · reference', 'chibi · painted', 'full · reference', 'full · painted (pose: curtsy)'][i], fill=(60, 40, 40), font=font); x += a.size[0] + 10
x = 10
for i, b in enumerate(B):
    o.paste(b, (x, H + 80)); d.text((x + 8, H + 52), ['chibi face · reference', 'chibi face · painted', 'full face · reference', 'full face · painted'][i], fill=(60, 40, 40), font=font); x += b.size[0] + 10
o.save('../output/sheets/char_ai_vs_ref.jpg', quality=90)
print(o.size)
