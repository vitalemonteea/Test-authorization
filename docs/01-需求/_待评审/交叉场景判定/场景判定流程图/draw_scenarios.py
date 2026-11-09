from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from html import escape
import math

OUT = Path(__file__).parent
W, H = 2520, 2120
im = Image.new('RGB', (W, H), 'white')
d = ImageDraw.Draw(im)
FONT = '/System/Library/Fonts/STHeiti Light.ttc'
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">', '<rect width="100%" height="100%" fill="white"/>']

def text(x, y, content, size=32, anchor='mm', color='#202124'):
    font = ImageFont.truetype(FONT, size)
    lines = content.split('\n')
    line_h = size + 12
    cy = y - (len(lines)-1)*line_h/2
    for line in lines:
        if anchor == 'mm':
            d.text((x, cy), line, font=font, fill=color, anchor='mm')
            svg.append(f'<text x="{x}" y="{cy}" text-anchor="middle" dominant-baseline="central" font-family="PingFang SC, Heiti SC, sans-serif" font-size="{size}" fill="{color}">{escape(line)}</text>')
        else:
            d.text((x, cy), line, font=font, fill=color, anchor='lm')
            svg.append(f'<text x="{x}" y="{cy}" dominant-baseline="central" font-family="PingFang SC, Heiti SC, sans-serif" font-size="{size}" fill="{color}">{escape(line)}</text>')
        cy += line_h

def box(x,y,w,h,label,fill='#F0F4FA',size=32,rounding=14):
    d.rounded_rectangle((x-w/2,y-h/2,x+w/2,y+h/2),rounding,fill=fill,outline='#222222',width=3)
    svg.append(f'<rect x="{x-w/2}" y="{y-h/2}" width="{w}" height="{h}" rx="{rounding}" fill="{fill}" stroke="#222" stroke-width="3"/>')
    text(x,y,label,size)

def diamond(x,y,w,h,label,size=32):
    pts=[(x-w/2,y),(x,y-h/2),(x+w/2,y),(x,y+h/2)]
    d.polygon(pts,fill='#FFF2CC',outline='#222222',width=3)
    svg.append('<polygon points="'+' '.join(f'{a},{b}' for a,b in pts)+'" fill="#FFF2CC" stroke="#222" stroke-width="3"/>')
    text(x,y,label,size)

def arrow(pts,label=None,lxy=None):
    d.line(pts,fill='#222222',width=3,joint='curve')
    svg.append('<polyline points="'+' '.join(f'{a},{b}' for a,b in pts)+'" fill="none" stroke="#222" stroke-width="3"/>')
    x,y=pts[-1]; a,b=pts[-2]; theta=math.atan2(y-b,x-a)
    p1=(x-14*math.cos(theta-.45),y-14*math.sin(theta-.45))
    p2=(x-14*math.cos(theta+.45),y-14*math.sin(theta+.45))
    d.line([p1,(x,y),p2],fill='#222222',width=3)
    svg.append('<polyline points="'+' '.join(f'{a},{b}' for a,b in [p1,(x,y),p2])+'" fill="none" stroke="#222" stroke-width="3"/>')
    if label:
        lx,ly=lxy
        font=ImageFont.truetype(FONT,28)
        bounds=d.textbbox((lx,ly),label,font=font,anchor='mm')
        d.rectangle((bounds[0]-7,bounds[1]-7,bounds[2]+7,bounds[3]+7),fill='white')
        svg.append(f'<rect x="{bounds[0]-7}" y="{bounds[1]-7}" width="{bounds[2]-bounds[0]+14}" height="{bounds[3]-bounds[1]+14}" fill="white"/>')
        text(lx,ly,label,28)

def separator(y):
    d.line([(45,y),(2475,y)],fill='#D3D8E0',width=2)
    svg.append(f'<line x1="45" y1="{y}" x2="2475" y2="{y}" stroke="#D3D8E0" stroke-width="2"/>')

text(60,60,'方案型测试授权 · 通用场景判定流程',44,'lm')
text(60,116,'业务核对稿｜先识别每个组件的场景，再叠加销售、历史和方案规则；未确认的规则需核实。',28,'lm','#5C6370')
text(60,190,'① 基础场景：这次申请究竟在做什么？',36,'lm')

# Band 1: eligibility and action classification.
box(195,365,280,150,'发起方案申请\n确定KA／非KA客户\n渠道取值需明确',fill='#EAE1FA',size=30)
diamond(560,365,310,175,'方案准入\n是否符合？')
arrow([(335,365),(405,365)])
box(560,565,430,120,'不符合：按准入规则处理\n类型／归属不清：先核实',fill='#FCE8E6',size=29)
arrow([(560,453),(560,505)],'否／不明确',(675,475))
diamond(980,365,310,175,'是否已有\n相关测试历史？')
arrow([(715,365),(825,365)],'是',(770,347))
diamond(1440,295,330,180,'首次时长／规格\n是否在默认内？',size=30)
arrow([(1135,365),(1195,365),(1195,295),(1275,295)],'否',(1200,265))
box(2080,240,690,105,'标准首次申请\n按首次规则判断是否免审批',size=31)
box(2080,365,690,105,'首次超过默认时长／规格\n核对可特批范围及审批路径',size=31)
arrow([(1605,295),(1660,295),(1660,240),(1735,240)],'是',(1675,218))
arrow([(1440,385),(1440,430),(1660,430),(1660,365),(1735,365)],'否',(1560,430))
diamond(1440,550,330,175,'是否延续\n原测试的时间？',size=31)
arrow([(980,453),(980,550),(1275,550)],'是',(1130,531))
box(2080,505,690,95,'续测／延期 → 看第②部分',fill='#EAE1FA',size=32)
box(2080,630,690,125,'增开模块／扩容 → 授权变更\n新一轮测试 → 复测；无变化 → 重复申请',size=29)
arrow([(1605,550),(1660,550),(1660,505),(1735,505)],'是',(1677,482))
arrow([(1440,638),(1440,678),(1660,678),(1660,630),(1735,630)],'否',(1570,678))
text(60,736,'准入包括：客户资格、次数／复测间隔、配额、环境／商机、产品可测试状态、组件组合。',28,'lm','#5C6370')
separator(780)

# Band 2: expiry and compliance are independent.
text(60,835,'② 续测／延期：授权是否过期？延期是否合规？',36,'lm')
box(195,1100,280,140,'延续原测试\n按客户类型\n读取延期规则',fill='#EAE1FA',size=30)
diamond(590,1100,320,180,'当前授权\n是否已过期？')
arrow([(335,1100),(430,1100)])
diamond(1090,980,350,190,'本次延期\n是否符合规则？')
diamond(1090,1240,350,190,'本次延期\n是否符合规则？')
arrow([(750,1100),(820,1100),(820,980),(915,980)],'否',(820,943))
arrow([(590,1190),(590,1240),(915,1240)],'是',(800,1220))
box(1640,920,560,105,'授权有效＋合规延期\n按正常延期路径办理',size=31)
box(1640,1045,560,105,'授权有效＋超规延期\n区分累计超规与单次超限',size=31)
box(1640,1180,560,105,'授权过期＋合规续测\n重开且继承测试历史',size=31)
box(1640,1305,560,105,'授权过期＋超规续测\n重开且按超规情况处理',size=31)
for cy,ry1,ry2 in [(980,920,1045),(1240,1180,1305)]:
    arrow([(1265,cy),(1305,cy),(1305,ry1),(1360,ry1)],'是',(1315,ry1-25))
    arrow([(1090,cy+95),(1090,ry2+75),(1310,ry2+75),(1310,ry2),(1360,ry2)],'否',(1200,ry2+75))
box(2240,1100,440,380,'延期规则检查\n\n客户类型适用上限\n首次／第N次延期\n单次＋累计时长\n是否允许延期\n最终可批准上限',fill='#FFF2CC',size=30)
text(60,1415,'合规延期也可能要审批；超规仅在允许特批时升级审批，禁止延期或超过绝对上限时按禁止规则处理。',28,'lm','#5C6370')
separator(1465)

# Band 3: all base actions must pass cross-entitlement rules.
text(60,1520,'③ 交叉检查：上面每一种场景，都还要经过这一层',36,'lm')
box(195,1780,280,140,'逐组件得到\n基础场景\n及合规结果',fill='#EAE1FA',size=30)
diamond(555,1780,310,180,'是否为\n销售设备？')
arrow([(335,1780),(400,1780)])
box(960,1655,420,135,'叠加销售设备规则\n正式权益满足：复用\n新测试权益：只处理差额',size=28)
box(960,1870,420,105,'借测／客户自有设备\n按对应来源规则处理',size=29)
arrow([(555,1690),(555,1655),(750,1655)],'是',(675,1635))
arrow([(710,1780),(720,1780),(720,1870),(750,1870)],'否',(720,1817))
diamond(1390,1780,330,185,'是否存在\n单品／方案\n授权交叉？',size=29)
arrow([(1170,1655),(1200,1655),(1200,1780),(1225,1780)])
arrow([(1170,1870),(1200,1870),(1200,1780)])
box(1810,1655,420,135,'查询全来源权益与历史\n复用重叠权益、只发差额\n不因换入口清零累计',size=28)
box(1810,1870,420,105,'无交叉：按基础结果\n保留本次测试历史',size=29)
arrow([(1390,1687),(1390,1655),(1600,1655)],'是',(1530,1635))
arrow([(1555,1780),(1575,1780),(1575,1870),(1600,1870)],'否',(1575,1820))
box(2260,1780,390,300,'整单综合判定\n\n检查组件状态／期限混合\n核对方案与单品审批\n得到：直接办理／审批\n不允许／待核实\n冲突规则由业务明确',fill='#EAE1FA',size=28)
arrow([(2020,1655),(2040,1655),(2040,1780),(2065,1780)])
arrow([(2020,1870),(2040,1870),(2040,1780)])
text(60,2020,'补充核查：换机／迁移／客户变更是否继承历史；并发申请、审批期间状态变化、部分失败重试是否重复授权。',28,'lm','#5C6370')
text(60,2070,'来源：单品V2场景表、方案申请规则。图中为通用场景框架，具体阈值、审批角色及规则优先级需业务确认。',26,'lm','#5C6370')

im.save(OUT/'方案型授权场景判定流程.png')
svg.append('</svg>')
(OUT/'方案型授权场景判定流程.svg').write_text('\n'.join(svg),encoding='utf-8')
for name,region in [('01-基础场景',(0,155,W,780)),('02-延期与重开',(0,790,W,1465)),('03-授权交叉',(0,1480,W,H))]:
    im.crop(region).save(OUT/f'{name}.png')
print('Saved PNG, SVG and three detail panels to',OUT)
