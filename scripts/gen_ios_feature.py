from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1320, 2868
FONTS = "C:/Windows/Fonts"

def fnt(name, size):
    try:
        return ImageFont.truetype(f"{FONTS}/{name}", size)
    except:
        return ImageFont.load_default()

# Catppuccin Mocha
BASE    = (30,  30,  46)
MANTLE  = (24,  24,  37)
CRUST   = (17,  17,  27)
SRF0    = (49,  50,  68)
SRF1    = (69,  71,  90)
OVL0    = (108, 112, 134)
OVL1    = (127, 132, 156)
TEXT_C  = (205, 214, 244)
SUBT0   = (166, 173, 200)
GREEN   = (166, 227, 161)
YELLOW  = (249, 226, 175)
MAUVE   = (203, 166, 247)
PAGE_BG   = (244, 237, 211)
PAGE_TEXT = (45,  31,  14)
# Pre-blended yellow highlight on cream: PAGE_BG*(1-0.55) + YELLOW*0.55
HIGHLIGHT = (247, 231, 159)

f_big  = fnt("consolab.ttf", 118)
f_year = fnt("consolab.ttf",  82)
f_sub  = fnt("consola.ttf",   48)
f_sm   = fnt("consola.ttf",   36)
f_lbl  = fnt("consola.ttf",   30)
f_book = fnt("georgia.ttf",   50)
f_mono = fnt("consola.ttf",   34)

img  = Image.new("RGBA", (W, H), (*BASE, 255))
draw = ImageDraw.Draw(img)

# ─────────────────────────────────────────────────────────────────
# TOP PANEL  (mirrors the left panel of the Android feature graphic)
# ─────────────────────────────────────────────────────────────────
TOP_H = 1010
draw.rectangle([0, 0, W, TOP_H], fill=(*MANTLE, 255))

# Corner brackets
for (x0, y0, sdx, sdy) in [(30, 30, 1, 1), (W-30, 30, -1, 1),
                            (30, TOP_H-30, 1, -1), (W-30, TOP_H-30, -1, -1)]:
    s = 26
    draw.line([(x0, y0), (x0+sdx*s, y0)],    fill=(*SRF1, 255), width=2)
    draw.line([(x0, y0), (x0, y0+sdy*s)],    fill=(*SRF1, 255), width=2)

# Comment label
draw.text((56, 56), "// pagegrabber-84", font=f_lbl, fill=(*OVL0, 255))

# App title
TX, TY = 56, 118
draw.text((TX, TY), "PageGrabber", font=f_big, fill=(*GREEN, 255))
bb1 = draw.textbbox((TX, TY), "PageGrabber", font=f_big)
TY2 = bb1[3] + 6
draw.text((TX, TY2), "'84", font=f_year, fill=(*YELLOW, 255))
bb2 = draw.textbbox((TX, TY2), "'84", font=f_year)

# Divider rule
RY = bb2[3] + 28
draw.line([(TX, RY), (W-56, RY)], fill=(*SRF0, 255), width=1)

# Tagline
draw.text((TX, RY+22),    "Scan · Highlight · Export",  font=f_sub, fill=(*TEXT_C, 255))
draw.text((TX, RY+22+62), "to Obsidian Markdown.",       font=f_sub, fill=(*MAUVE,  255))

# Feature bullets
FY = RY + 22 + 62 + 90
bullets = [
    ("[ on-device OCR  ]",      GREEN),
    ("[ instant highlights ]",  OVL1),
    ("[ .md & .zip export ]",   OVL1),
]
for i, (text, col) in enumerate(bullets):
    draw.text((TX, FY + i*52), text, font=f_sm, fill=(*col, 255))

# Cursor
CY = TOP_H - 72
draw.text((TX,      CY), "█", font=f_sub, fill=(*GREEN,  255))
draw.text((TX + 30, CY), "_", font=f_sub, fill=(*OVL0, 255))

# Separator between panels
draw.line([(0, TOP_H), (W, TOP_H)], fill=(*SRF1, 255), width=2)

# ─────────────────────────────────────────────────────────────────
# BOTTOM PANEL  (cream book page, mirrors the right panel)
# ─────────────────────────────────────────────────────────────────
PAGE_Y = TOP_H
STRIP_H = 200          # action-button strip at the very bottom
STRIP_Y = H - STRIP_H
draw.rectangle([0, PAGE_Y, W, H], fill=(*PAGE_BG, 255))

# Yellow left accent border
draw.rectangle([0, PAGE_Y, 5, H], fill=(*YELLOW, 255))

# Book text
TBX = 56
TBY = PAGE_Y + 64
LH  = 80

lines = [
    ("She had always found solace in the",           False),
    ("margins of old books, where forgotten",         True),
    ("readers had left their thoughts behind.",       True),
    ("",                                               False),
    ("The words seemed alive—pressed flat",           False),
    ("like flowers, waiting to bloom again.",         False),
    ("",                                               False),
    ("Every annotation was a conversation",           False),
    ("across time, a whisper from another",           False),
    ("mind that once dwelt here.",                    False),
    ("",                                               False),
    ("She turned a page. The chapter heading",        False),
    ("was underlined three times in blue ink,",       False),
    ("and someone had written 'YES' in the",          False),
    ("margin, decades before she was born.",          False),
    ("",                                               False),
    ("That stranger understood something.",           False),
    ("Whatever it was, she was going to",             False),
    ("find it too.",                                   False),
]

# Draw highlight rectangles first (behind text)
for i, (line, hl) in enumerate(lines):
    if line and hl:
        bb = draw.textbbox((TBX, TBY + i*LH), line, font=f_book)
        draw.rectangle([TBX-3, bb[1]-5, bb[2]+3, bb[3]+5], fill=(*HIGHLIGHT, 255))

# Draw text on top
for i, (line, _) in enumerate(lines):
    if line:
        draw.text((TBX, TBY + i*LH), line, font=f_book, fill=(*PAGE_TEXT, 255))

# Action strip (dark bar at very bottom — same as the Android feature graphic)
draw.rectangle([0, STRIP_Y, W, H], fill=(*MANTLE, 255))
draw.line([(0, STRIP_Y), (W, STRIP_Y)], fill=(*SRF1, 255), width=2)

BW = (W - 60) // 2
BP = 20
BH = 72
R1Y = STRIP_Y + 24
R2Y = R1Y + BH + 12

def action_btn(text, x, y, col):
    draw.rectangle([x, y, x+BW, y+BH], outline=(*col, 255), width=2)
    bb = draw.textbbox((0, 0), text, font=f_mono)
    tx = x + (BW - (bb[2]-bb[0])) // 2
    ty = y + (BH - (bb[3]-bb[1])) // 2
    draw.text((tx, ty), text, font=f_mono, fill=(*col, 255))

action_btn("[ HIGHLIGHT ]",  BP,        R1Y, YELLOW)
action_btn("[ + NOTE ]",     BP+BW+20,  R1Y, YELLOW)
action_btn("[ WHOLE PAGE ]", BP,        R2Y, MAUVE)
action_btn("[ NEW SCAN ]",   BP+BW+20,  R2Y, GREEN)

# ─────────────────────────────────────────────────────────────────
# SCANLINE OVERLAY
# ─────────────────────────────────────────────────────────────────
scanlines = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sl = ImageDraw.Draw(scanlines)
for y in range(0, H, 4):
    sl.rectangle([0, y, W, y+1], fill=(0, 0, 0, 28))
img = Image.alpha_composite(img, scanlines)

# ─────────────────────────────────────────────────────────────────
# SAVE
# ─────────────────────────────────────────────────────────────────
out = "assets/screenshot_ios_feature.png"
img.convert("RGB").save(out, "PNG", optimize=True)
check = Image.open(out)
print(f"Saved: {out}  {check.size}  {os.path.getsize(out)//1024} KB")
