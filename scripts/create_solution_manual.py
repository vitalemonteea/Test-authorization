from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION_START
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_LINE_SPACING

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / '03-交付' / '操作手册' / '方案型授权操作手册.docx'

BLACK = '000000'
BLUE = '1F4E79'
LIGHT_BLUE = 'DCE6F1'
PALE_BLUE = 'F4F8FC'
LIGHT_GRAY = 'D9E1F2'
PALE_GRAY = 'F7F8FA'
MID_GRAY = '666666'
RED = 'B00020'


def set_run_font(run, size=10.5, bold=False, color=BLACK, italic=False):
    run.font.name = 'Arial Unicode MS'
    run._element.rPr.rFonts.set(qn('w:eastAsia'), 'Arial Unicode MS')
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor.from_string(color)


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn('w:shd'))
    if shd is None:
        shd = OxmlElement('w:shd')
        tc_pr.append(shd)
    shd.set(qn('w:fill'), fill)
    shd.set(qn('w:val'), 'clear')


def set_cell_margins(cell, top=90, start=110, bottom=90, end=110):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in('w:tcMar')
    if tc_mar is None:
        tc_mar = OxmlElement('w:tcMar')
        tc_pr.append(tc_mar)
    for m, v in [('top', top), ('start', start), ('bottom', bottom), ('end', end)]:
        node = tc_mar.find(qn(f'w:{m}'))
        if node is None:
            node = OxmlElement(f'w:{m}')
            tc_mar.append(node)
        node.set(qn('w:w'), str(v))
        node.set(qn('w:type'), 'dxa')


def set_cell_borders(cell, color='D9D9D9', size='5'):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in('w:tcBorders')
    if borders is None:
        borders = OxmlElement('w:tcBorders')
        tc_pr.append(borders)
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        tag = f'w:{edge}'
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn('w:val'), 'single')
        element.set(qn('w:sz'), size)
        element.set(qn('w:space'), '0')
        element.set(qn('w:color'), color)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement('w:tblHeader')
    tbl_header.set(qn('w:val'), 'true')
    tr_pr.append(tbl_header)


def set_keep_with_next(paragraph):
    p_pr = paragraph._p.get_or_add_pPr()
    keep = OxmlElement('w:keepNext')
    p_pr.append(keep)


def set_no_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement('w:cantSplit')
    tr_pr.append(cant_split)


def set_cell_text(cell, text, bold=False, color=BLACK, size=9.2, align=None):
    cell.text = ''
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.1
    if align is not None:
        p.alignment = align
    run = p.add_run(str(text))
    set_run_font(run, size=size, bold=bold, color=color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_margins(cell)
    set_cell_borders(cell)


def add_table(doc, headers, rows, widths=None, font_size=9.2):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    hdr = table.rows[0]
    set_repeat_table_header(hdr)
    set_no_split(hdr)
    for idx, title in enumerate(headers):
        set_cell_text(hdr.cells[idx], title, bold=True, color=BLACK, size=font_size, align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_shading(hdr.cells[idx], LIGHT_BLUE)
    for row_idx, values in enumerate(rows):
        row = table.add_row()
        set_no_split(row)
        for idx, value in enumerate(values):
            align = WD_ALIGN_PARAGRAPH.CENTER if idx == 0 and len(headers) >= 3 else WD_ALIGN_PARAGRAPH.LEFT
            set_cell_text(row.cells[idx], value, size=font_size, align=align)
            set_cell_shading(row.cells[idx], 'FFFFFF' if row_idx % 2 == 0 else PALE_GRAY)
    if widths:
        for row in table.rows:
            for idx, width in enumerate(widths):
                row.cells[idx].width = Inches(width)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return table


def add_para(doc, text='', size=10.5, bold=False, color=BLACK, italic=False, before=0, after=5, first_indent=True, align=None):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.18
    if first_indent and text:
        p.paragraph_format.first_line_indent = Pt(21)
    if align is not None:
        p.alignment = align
    run = p.add_run(text)
    set_run_font(run, size=size, bold=bold, color=color, italic=italic)
    return p


def add_bullets(doc, items, level=0, size=10.3, color=BLACK):
    for item in items:
        p = doc.add_paragraph(style='List Bullet' if level == 0 else 'List Bullet 2')
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.12
        run = p.add_run(item)
        set_run_font(run, size=size, color=color)


def add_numbered(doc, items, size=10.3):
    for item in items:
        p = doc.add_paragraph(style='List Number')
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.12
        run = p.add_run(item)
        set_run_font(run, size=size)


def add_heading(doc, text, level=1):
    p = doc.add_paragraph(style=f'Heading {level}')
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.space_before = Pt(12 if level == 1 else 8)
    p.paragraph_format.space_after = Pt(5)
    run = p.add_run(text)
    set_run_font(run, size={1: 16, 2: 13, 3: 11.5}[level], bold=True, color=BLACK)
    return p


def add_note(doc, lead, text, color=BLUE):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Pt(12)
    p.paragraph_format.right_indent = Pt(12)
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.12
    r1 = p.add_run(lead)
    set_run_font(r1, size=10, bold=True, color=color)
    r2 = p.add_run(text)
    set_run_font(r2, size=10, color=BLACK)
    return p


def setup_document(doc):
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.7)
    section.bottom_margin = Inches(0.65)
    section.left_margin = Inches(0.72)
    section.right_margin = Inches(0.72)

    styles = doc.styles
    normal = styles['Normal']
    normal.font.name = 'Arial Unicode MS'
    normal._element.rPr.rFonts.set(qn('w:eastAsia'), 'Arial Unicode MS')
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = RGBColor.from_string(BLACK)
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing = 1.18
    title_style = styles['Title']
    title_style.font.name = 'Arial Unicode MS'
    title_style._element.rPr.rFonts.set(qn('w:eastAsia'), 'Arial Unicode MS')
    title_style.font.color.rgb = RGBColor.from_string(BLACK)
    title_style_ppr = title_style._element.get_or_add_pPr()
    title_border = title_style_ppr.find(qn('w:pBdr'))
    if title_border is not None:
        title_style_ppr.remove(title_border)
    for style_name, size in [('Heading 1', 16), ('Heading 2', 13), ('Heading 3', 11.5)]:
        style = styles[style_name]
        style.font.name = 'Arial Unicode MS'
        style._element.rPr.rFonts.set(qn('w:eastAsia'), 'Arial Unicode MS')
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(BLACK)
        style.paragraph_format.keep_with_next = True
    for style_name in ('List Bullet', 'List Bullet 2', 'List Number'):
        style = styles[style_name]
        style.font.name = 'Arial Unicode MS'
        style._element.rPr.rFonts.set(qn('w:eastAsia'), 'Arial Unicode MS')
        style.font.size = Pt(10.3)
        style.font.color.rgb = RGBColor.from_string(BLACK)

    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fr = footer.add_run('W3 测试授权平台 方案型授权操作手册')
    set_run_font(fr, size=8.5, color=MID_GRAY)


def add_title(doc):
    p = doc.add_paragraph(style='Title')
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    r = p.add_run('方案型授权操作手册')
    set_run_font(r, size=24, bold=True, color=BLACK)
    p2 = doc.add_paragraph()
    p2.paragraph_format.space_after = Pt(8)
    r2 = p2.add_run('W3 测试授权平台字段填写与审批操作说明')
    set_run_font(r2, size=13, color=MID_GRAY)
    add_para(doc, '版本：V2 字段填写版　适用页面：02-原型/app/测试设备授权平台V2.html　更新日期：2026 年 9 月 15 日', size=9.5, color=MID_GRAY, first_indent=False, after=9)
    add_note(doc, '本手册解决什么问题：', '帮助一线销售、售前、实施和测试人员在 W3 中完成方案型授权申请，明确每个字段的选择范围、填写方式、必填条件和提交后的处理结果。')
    add_note(doc, '使用边界：', '字段名称和选项以当前 V2 原型页面为准；页面中的日期、客户、借测单和授权编码是 Mock 数据，只用于演示，不代表生产业务数据。审批节点和人员映射如未在页面或已确认规则中落地，本手册会明确标注为待确认。')
    add_para(doc, '方案型授权按整套方案提交。一张申请单可以同时包含设备产品线和 XaaS 产品线，方案及产品线范围由借测单或启用配置确定，申请人只补充授权所需参数。审批通过后，所有产品线一起执行授权，全部成功后在授权记录中生成一条解决方案主记录。', first_indent=True, after=8)


def chapter_one(doc):
    add_heading(doc, '第一章 申请入口和总体流程', 1)
    add_heading(doc, '1.1 两种授权入口', 2)
    add_table(doc, ['入口', '适用情况', '必须填写', '系统带出或校验'], [
        ['关联借测单', '方案中包含借测设备，且资产系统借测单已审批通过', '客户、借测单号', '方案、产品线、申请人、客户、设备、借测期限、资产审批结果'],
        ['纯软件本地申请', '不涉及硬件借用，在 W3 内直接申请启用方案', '解决方案、客户', '启用方案的产品线；含 XaaS 时校验客户云图账号和云图 ID'],
    ], widths=[1.15, 2.05, 1.55, 2.85])
    add_note(doc, '先判断入口：', '需要借硬件时选“关联借测单”；没有硬件借用时选“纯软件本地申请”。两种入口都要经过 W3 整单审批。')
    add_heading(doc, '1.2 页面操作顺序', 2)
    add_numbered(doc, [
        '进入“解决方案型授权”页，在“授权类型”中选择“关联借测单”或“纯软件本地申请”。',
        '按入口填写客户和方案来源。关联借测单时先选客户，再从该客户的借测单下拉中选择单号并点击“查询并关联”；本地申请时选择启用方案并选择客户。',
        '核对“方案范围”中的解决方案、关联产品线和授权时间。该区域为只读信息，不允许新增、删除或替换产品线。',
        '如果页面出现“业务申请信息”，按所选方案填写对应字段。分布式安全运营、全球加速、全球组网的业务字段不同。',
        '在“授权参数”区域按左侧产品线逐项填写。产品线可同时包含设备线和 XaaS 线；切换产品线不会改变其他产品线的填写内容。',
        '完成所有必填字段后点击“提交 W3 整单审批”。系统先做整单校验，再进入审批。',
        '审批通过并且所有产品授权成功后，到“授权记录”查看以 SOL 开头的解决方案主记录，展开后查看每个产品明细。',
    ])
    add_heading(doc, '1.3 申请状态', 2)
    add_table(doc, ['状态', '含义', '申请人处理'], [
        ['草稿', '已选择入口或方案，尚未提交', '补齐必填字段后提交'],
        ['待 W3 审批', '整单已提交，等待审批处理', '查看审批进度，暂不重复提交'],
        ['W3 审批已驳回', '审批人驳回整单', '根据审批意见修改后重新提交'],
        ['已授权', '整单审批通过，所有产品授权成功', '到授权记录查看和使用授权信息'],
        ['整单失败', '至少一个产品授权失败，整单结果不可交付', '查看失败原因，联系平台支持处理'],
    ], widths=[1.25, 3.05, 3.3])
    add_heading(doc, '1.4 不能提交的情况', 2)
    add_bullets(doc, [
        '借测单不存在、未审批通过、已归还、已撤销或资产系统查询失败。',
        '借测单带出的方案和产品线信息缺失，或与当前可用配置不一致。',
        '含 XaaS 产品线但客户没有可用的云图账号和云图 ID。',
        '业务申请信息、产品授权参数、模块规格或必要材料未填写完整。',
        '产品线开关处于关闭状态，且该产品线未参与本次申请；需要使用时先打开对应开关。',
    ])


def chapter_two(doc):
    add_heading(doc, '第二章 基本信息和方案范围', 1)
    add_heading(doc, '2.1 基本信息字段', 2)
    add_table(doc, ['字段', '何时显示', '选择或填写内容', '校验和注意事项'], [
        ['授权类型', '始终显示', '关联借测单；纯软件本地申请', '必选。入口决定后续字段，不要在同一张单中混用两种入口。'],
        ['客户', '两种入口都显示', '输入客户名称或客户编码，从下拉结果中选择真实客户', '必选。选择后页面显示客户类型和销售负责人；不要只输入文本而不点选下拉结果。'],
        ['借测单号', '关联借测单时显示', '先选客户，再选择该客户下的借测单', '必选。只允许关联审批通过、未归还、未撤销的借测单。'],
        ['解决方案', '纯软件本地申请时显示', '从“请选择启用方案”下拉中选择已启用配置', '必选。停用方案不会出现在可选列表中。'],
        ['接收邮箱', '纯软件本地申请时显示', '填写接收授权结果和相关文件的邮箱，建议使用客户邮箱', '当前页面为非必填；邮箱格式应正确。'],
        ['云图账号和云图 ID', '方案含 XaaS 产品线时生效', '客户只有一个云图账号时自动关联；多个账号时选择本次授权所属账号', 'XaaS 授权对象是云图 ID，不是设备 ID 或设备 SN。没有云图身份不能提交。'],
    ], widths=[1.25, 1.55, 2.75, 2.15])
    add_heading(doc, '2.2 关联借测单后的只读信息', 2)
    add_table(doc, ['区域', '字段', '页面行为'], [
        ['借测信息', '借测单号、申请人、客户、借测期限、资产审批、产品或服务数量', '查询成功后由资产系统带出，只读展示。'],
        ['方案范围', '解决方案、关联产品线、授权时间', '方案和产品线来自借测审批内容；授权时间来自方案配置授权天数，所有产品线统一。'],
        ['设备信息', '设备 ID、设备 SN、集群标识或硬件信息文件', '设备线按产品规则显示；借测单带出的设备信息优先使用，申请人只补齐页面要求的字段。'],
    ], widths=[1.2, 2.7, 3.8])
    add_note(doc, '只读字段：', '“方案范围”中的内容不是授权参数。不要尝试通过修改页面文本来改变方案或产品线，产品线必须与资产审批或启用配置一致。')
    add_heading(doc, '2.3 方案配置管理员字段', 2)
    add_para(doc, '具备配置权限的用户可从顶部“系统设置”进入“解决方案配置”。该区域维护的是解决方案与产品线关系，不维护产品授权参数。', first_indent=True)
    add_table(doc, ['字段', '选择或填写内容', '规则'], [
        ['方案编码', '例如 SOL-GLOBAL-005', '必填且唯一；保存后编辑时不可修改。'],
        ['方案名称', '使用业务可识别的完整名称，例如全球组网方案', '必填；有效配置中不可重复。'],
        ['关联产品线', '勾选一个或多个设备线或 XaaS 线', '至少选择一个；同一产品线不要重复选择。'],
        ['授权时间', '填写正整数天数，例如 30、60、90', '必填正整数；申请页按提交当天日期计算授权到期日。'],
        ['状态', '启用或停用', '停用后不出现在新的本地申请方案下拉中；历史申请和历史借测单仍保留。'],
    ], widths=[1.35, 3.0, 3.35])


def chapter_three(doc):
    add_heading(doc, '第三章 业务申请信息字段', 1)
    add_para(doc, '业务申请信息只在特定方案中显示，字段用于审批评估。全球加速和全球组网的三项通用字段统一放在本模块，不在 SASE-GA、SASE-ZTNA 或 SASE-SWG 产品面板重复填写。', first_indent=True)
    add_heading(doc, '3.1 分布式安全运营方案', 2)
    add_table(doc, ['字段', '控件', '应选择或填写的内容', '填写建议'], [
        ['测试主打场景', '单选下拉', '原有 NDR 升级场景（我司 SIP/友商 NDR）；新建安全运营场景；SOC 替换场景（含 SOC 保存）；多分支统一管理场景', '选择本次测试最主要的业务场景，只选一个。'],
        ['测试驱动力', '多选', '各类安全设备告警量大且误报多；现有威胁运营平台不达预期，想替换；重大安全问题，需要加强安全建设；被监管单位通报，需要加强安全建设；护网重保缺少统一值守平台；客户有创新及体现政绩的诉求', '至少选一项。按客户真实诉求勾选，可多选。'],
        ['客户预期效果', '多选', '全流量检测；聚合降噪；告警研判；智能对抗；威胁运营成果展示', '至少选一项。选择能够在 POC 中验证的效果。'],
        ['平台接入组件说明', '多行文本', '填写已部署或计划接入的组件，例如 SIP、AF、第三方日志平台、终端安全组件', '说明组件名称、数量或接入范围，避免只填写“无”。'],
        ['测试需求调研文档', '文件上传', '上传客户测试需求或调研材料，支持 .doc、.docx、.pdf、.xlsx、.xls', '必填。上传前检查文件可打开且内容与本次方案一致。'],
        ['客户原因及后续转销计划说明', '多行文本', '填写客户为什么需要测试，以及测试通过后的采购或转销计划', '必填。建议写明计划时间和后续动作。'],
    ], widths=[1.55, 1.0, 3.4, 1.75], font_size=8.8)
    add_note(doc, '产品线开关：', '分布式安全运营方案中的 AF 和 aES 为可选产品线开关，默认关闭；需要本次授权时打开对应开关。XDR 和 STA 按方案范围参与申请。')
    add_heading(doc, '3.2 全球加速方案', 2)
    add_para(doc, '全球加速方案分为 SaaS 版和本地版，两种方案都显示同一组业务申请信息。', first_indent=True)
    add_table(doc, ['字段', '控件', '选择或填写内容', '规则'], [
        ['客户需求', '多行文本', '写清需要改善的访问、加速或安全接入问题，例如海外办公访问国内核心系统时延高', '必填，内容应能对应测试目标。'],
        ['项目规模', '多行文本', '填写覆盖区域、用户数量、站点数量或预计接入规模，例如 3 个海外区域、约 800 名用户', '必填，使用可核验的数量和范围。'],
        ['竞争对手', '多行文本', '填写对比方案或竞争产品，例如传统国际专线方案、Zscaler', '必填；没有直接竞争对手时说明当前替代方案。'],
        ['客户所在省份或国家', '单行文本', '填写客户项目的主要所在省份或国家，例如广东、新加坡', '全球加速方案显示且必填；全球组网方案不显示。'],
        ['备注', '多行文本', '填写其他需要审批人了解的背景', '全球加速方案显示，可选；全球组网方案不显示。'],
    ], widths=[1.55, 1.0, 3.55, 1.6])
    add_note(doc, '避免重复填写：', 'SASE-GA 和 SASE-ZTNA 产品面板只填写各自的授权参数；客户需求、项目规模、竞争对手等业务信息统一填写在本节。')
    add_heading(doc, '3.3 全球组网方案', 2)
    add_table(doc, ['字段', '控件', '选择或填写内容', '规则'], [
        ['客户需求', '多行文本', '描述海外办公、跨区域访问或网络质量验证目标', '必填。'],
        ['项目规模', '多行文本', '填写覆盖区域、站点数量和用户规模', '必填。'],
        ['竞争对手', '多行文本', '填写传统专线、其他组网方案或竞争产品', '必填。'],
    ], widths=[1.55, 1.0, 3.55, 1.6])
    add_para(doc, '全球组网方案的“客户所在省份或国家”和“备注”不显示。产品线为 AF、SASE-GA、SASE-SWG；SASE-SWG 默认关闭，需要使用时打开产品线开关。', first_indent=True)
    add_heading(doc, '3.4 其他方案', 2)
    add_para(doc, '企业云一体化方案、安全态势感知方案和云网安全运营方案当前不显示方案级业务申请信息模块。它们只显示基本信息、方案范围和各产品线对应的授权参数。', first_indent=True)


def add_device_line_tables(doc):
    add_heading(doc, '4.1 设备线通用字段', 2)
    add_table(doc, ['字段', '选择或填写内容', '规则'], [
        ['版本', '选择或确认产品版本，例如 AF-8.0.99、HCI-6.8.1-VKEY、STA3.0.25', '按实际部署版本选择；借测单带出的方案和产品线不可修改。'],
        ['授权有效期', '查看系统根据方案授权天数生成的日期', '只读，所有参与本方案的产品线统一取方案授权时间。'],
        ['设备 ID', '填写或确认产品对应设备 ID', '设备线必填；借测单场景优先使用资产带出的设备 ID。'],
        ['硬件信息文件', '上传产品要求的硬件信息文件', 'HCI 等需要硬件识别的产品线必填；使用页面允许的文件格式。'],
        ['集群标识', '填写与硬件信息文件对应的集群标识', 'HCI/SCP 类集群产品必须与材料中的集群一致。'],
        ['授权模块', '在模块卡中按需开启，并填写展开后的规格参数', '模块卡按产品线分组；未启用的模块不参与本次授权。'],
    ], widths=[1.35, 3.3, 3.05])
    add_heading(doc, '4.2 AF 字段', 2)
    add_table(doc, ['模块或字段', '页面控件', '应填写内容'], [
        ['版本', '单行输入', 'Mock 默认 AF-8.0.99；按实际部署版本确认。'],
        ['设备 ID', '单行输入', '借测单 BOR-202608-006 示例为 GW-AF-930；本地申请填写真实 AF 设备 ID。'],
        ['网关序列号', '数字输入', '用户个数、线路数、分支机构数，均填写正整数。'],
        ['SSL VPN 序列号', '数字输入', '用户个数，填写正整数。'],
        ['增强功能序列号', '开关', '需要 WAF、PVS、DLP、Tamper 等增强功能时开启。'],
        ['网关杀毒功能开通', '开关', '需要网关杀毒能力时开启。'],
        ['VMware 带宽授权', '下拉', '授权 10Mbs、授权 50Mbs、授权 100Mbs、授权 200Mbs、授权 500Mbs。'],
        ['硬件规格', '下拉', '授权 CPU2 核、授权 CPU4 核、授权 CPU8 核、授权 CPU16 核。'],
        ['日期类授权', '日期或单行输入', '杀毒引擎更新、云脑云智、云脑云鉴、门户网站保护、软件升级、云蜜罐、智能运营、SOFAST 优化等填写授权结束日期。'],
        ['物联网安全功能开通', '开关', '需要物联网安全能力时开启。'],
        ['物联网资产指纹规则库更新', '日期或单行输入', '填写规则库更新授权结束日期。'],
    ], widths=[1.8, 1.25, 4.65], font_size=9)
    add_heading(doc, '4.3 aES 和 STA 字段', 2)
    add_table(doc, ['产品线', '字段', '应填写内容'], [
        ['aES', '版本、设备 ID', '确认 aES-3.0.0 或实际部署版本；填写对应设备 ID。'],
        ['aES', 'aES 平台软件', '授权数量填写正整数；授权有效期填写不晚于方案授权结束时间的日期。'],
        ['STA', '版本、设备 ID', 'Mock 默认 STA3.0.25；借测单带出设备 ID，纯软件或其他入口按页面要求填写。'],
        ['STA', '网关序列号、软件升级、Web 应用防护', '按需开启模块卡；展开后填写页面显示的规格或日期字段。'],
    ], widths=[1.15, 2.25, 4.3])
    add_heading(doc, '4.4 HCI 和 SCP 字段', 2)
    add_table(doc, ['产品线', '字段', '应填写内容和限制'], [
        ['HCI', '版本', 'Mock 默认 HCI-6.8.1-VKEY；按实际部署版本确认。'],
        ['HCI/SCP', '硬件信息文件', '上传对应硬件信息文件。HCI/SCP 的设备事实按客户、产品线和集群标识识别。'],
        ['HCI/SCP', '集群标识', '填写与硬件信息文件对应的集群标识。'],
        ['HCI', '计算虚拟化', '集群内物理 CPU 颗数限制、升级授权、使用授权；容量限制当前 Mock 提示最大 20。'],
        ['HCI', '桌面虚拟化', 'GPU 虚拟机 CPU/内存、普通虚拟机 CPU/内存、物理 CPU 颗数、升级授权、软件到期时间。'],
        ['HCI', '网络虚拟化', 'CPU 颗数和使用授权结束时间。'],
        ['SCP', '授权模块和规格', '按页面显示的模块卡填写；不确定的容量或版本不要自行扩大，提交前核对业务规则。'],
    ], widths=[1.25, 2.15, 4.3], font_size=9)
    add_heading(doc, '4.5 AC 和 NGAF 字段', 2)
    add_table(doc, ['产品线', '模块或字段', '应填写内容'], [
        ['AC', '网关序列号', '线路数、分支数、移动数，均填写正整数。'],
        ['AC', '多功能序列号', '在 SSL 内容识别、日志中心 DKey 查询、应用审计、个人通信内容审计、内容审计、行为审计、VPN 配置中至少选择一项。'],
        ['AC', '其他授权项', '上网安全授权、应用识别或 URL 库更新、终端接入安全、软件升级、防泄密外发审计，按需填写数量或授权结束日期。'],
        ['NGAF', 'Gateway', 'Max Concurrent Users、Lines、Branch VPN Sites 填写正整数。'],
        ['NGAF', 'SSL VPN', 'Max Concurrent Users 填写正整数。'],
        ['NGAF', 'VMware Bandwidth', '下拉选择 100 Mbps、200 Mbps、500 Mbps 或 1 Gbps。'],
        ['NGAF', 'Hardware Specifications', '下拉选择 2 cores、4 cores、8 cores 或 16 cores。'],
        ['NGAF', '日期或开关模块', 'Engine Model Update、Neural-X、Website Protection、Software Update、Threat Deception、Intelligent Operations、Threat Intelligence Gateway、SOFAST 等填写日期；IoT Security 为开关。'],
    ], widths=[1.2, 2.35, 4.15], font_size=8.9)
    add_heading(doc, '4.6 AD WOC WAF 等其他设备线', 2)
    add_para(doc, '当前原型对 AD、WOC、WAF 等产品线沿用设备线通用结构：版本、授权有效期、设备 ID、授权模块和规格参数。打开对应产品线后，以页面显示的模块卡名称和输入控件为准；每个模块只填写实际需要的规格，不要凭经验补写页面没有出现的字段。', first_indent=True)


def add_xaas_tables(doc):
    add_heading(doc, '第五章 XaaS 产品线字段', 1)
    add_para(doc, 'XaaS 产品线以客户云图身份为授权对象。方案中含 XaaS 产品线时，客户必须具备云图账号和云图 ID；设备 ID 和设备 SN 不适用于 XaaS 授权。', first_indent=True)
    add_heading(doc, '5.1 SASE-GA 全球加速', 2)
    add_table(doc, ['字段', '控件', '选择或填写内容', '说明'], [
        ['授权有效期', '只读日期', '查看方案统一授权结束日期', '不能单独修改。'],
        ['带宽', '下拉', '5M、10M、20M、30M、50M', '按实际验证目标选择；全球加速和全球组网均使用这五档。'],
        ['业务信息', '方案级文本', '客户需求、项目规模、竞争对手在业务申请信息中填写', '产品面板不重复显示。'],
    ], widths=[1.35, 1.1, 2.8, 2.8])
    add_heading(doc, '5.2 SASE-ZTNA 零信任网络访问', 2)
    add_table(doc, ['字段', '控件', '选择或填写内容', '说明'], [
        ['授权有效期', '只读日期', '查看方案统一授权结束日期', '不能单独修改。'],
        ['授权用户数', '数字输入', '填写大于等于 1 的用户数；Mock 默认 50', '全球加速 SaaS 版必须填写。'],
        ['业务信息', '方案级文本', '全球加速场景统一填写客户需求、项目规模、竞争对手', '不在产品面板重复填写。'],
    ], widths=[1.35, 1.1, 2.8, 2.8])
    add_heading(doc, '5.3 SASE-SWG 互联网安全访问', 2)
    add_table(doc, ['字段', '控件', '选择或填写内容', '说明'], [
        ['产品线开关', '开关', '全球组网方案默认关闭；需要申请时打开', '关闭时不参与本单校验和提交。'],
        ['版本', '单行输入', '全球组网 Mock 默认 SASE-SWG 标准版；按页面显示版本确认', '全球组网场景只显示版本和授权有效期。'],
        ['授权有效期', '只读日期', '查看方案统一授权结束日期', '不能单独修改。'],
        ['业务信息', '方案级文本', '全球组网使用共享业务信息模块填写客户需求、项目规模、竞争对手', '不要在 SWG 面板重复填写。'],
    ], widths=[1.35, 1.1, 2.8, 2.8])
    add_heading(doc, '5.4 SaaS XDR 和通用 XDR 字段', 2)
    add_table(doc, ['字段', '控件', '可选内容或填写要求'], [
        ['版本', '输入或下拉', '选择页面提供的 XDR/SaaS-XDR 版本。分布式安全运营方案固定为 LOCAL-XDR2.0.45及以上版本（XDR+GPT）。'],
        ['授权有效期', '只读日期', '统一取方案授权时间。'],
        ['日志量（万条）', '数字输入', '填写大于等于 1 的日志量；按测试规模填写。'],
        ['测试场景', '下拉', '原有 NDR 升级场景；新建安全运营场景；SOC 替换场景；多分支统一管理场景。'],
        ['测试驱动力', '下拉', '告警量大且误报多；现有平台不达预期想替换；重大安全问题；监管通报；护网重保；合规要求；MSS 接入限制；客户创新诉求；其他。'],
        ['核心需求', '下拉', '常态化威胁检测或运营中心；护网重保值守平台；分析溯源平台；外部合规；安全大屏；MSS 接入限制；客户创新诉求。'],
        ['测试效果预期', '下拉', '全流量检测；聚合降噪；全量高经验盘；智能对抗；威胁运营成果展示。'],
        ['是否 PK', '下拉', '否；仅 MSS；仅产品；两者都 PK。选择“否”时不填写 PK 友商公司名。'],
        ['PK 友商公司名', '单行输入', '当“是否 PK”不是“否”时填写友商公司名。'],
        ['客户环境信息', '单行输入', '填写客户已部署设备、日志来源和组件版本。'],
        ['安全运营模式', '下拉', '无运营；单点运维；SIP 运营；友商平台；代运营。'],
        ['安全人员配置', '下拉', '1 个；2 个；3 个以上；渠道代维；客户自己运维。'],
        ['深信服现有设备或组件', '多选', 'AF、aES、SIP、XDR、STA，可多选。'],
        ['第三方设备类型及版本号', '单行输入', '填写第三方 EDR、日志平台等设备类型和版本。'],
        ['预算信息', '下拉', '当年预算；明年预算。'],
        ['安全预算区间', '下拉', '10-20W；20-30W；30-50W；50-80W；80W+。'],
        ['项目预计落地时间', '日期', '填写预计落地日期。'],
        ['客户信息收集表', '文件上传', '上传 .xlsx 或 .xls 文件，内容应与客户环境和测试规模一致。'],
    ], widths=[1.65, 1.15, 5.25], font_size=8.9)
    add_heading(doc, '5.5 分布式安全运营 XDR 特殊规则', 2)
    add_table(doc, ['字段', '页面表现', '填写内容'], [
        ['版本', '下拉仅保留一个选项', 'LOCAL-XDR2.0.45及以上版本（XDR+GPT）。'],
        ['授权有效期', '只读日期', '统一取方案授权时间。'],
        ['授权模块', '模块卡列表', '按页面默认模块卡填写；本场景的业务评估字段在“业务申请信息”模块填写。'],
        ['AF 和 aES', '产品线开关', '默认关闭，按本次方案需要分别打开；打开后再填写设备线参数。'],
    ], widths=[1.65, 2.2, 4.2])


def chapter_six(doc):
    add_heading(doc, '第六章 授权模块开关和参数填写', 1)
    add_para(doc, '授权参数区域左侧按产品线定位，右侧显示当前产品线的模块卡。模块卡头部展示启用状态和参数数量，点击卡头可展开或收起参数。产品线开关只出现在按需产品线，关闭时该产品线不会参与本次整单提交。', first_indent=True)
    add_heading(doc, '6.1 产品线开关', 2)
    add_table(doc, ['开关位置', '默认状态', '操作方式', '提交影响'], [
        ['分布式安全运营方案的 AF', '关闭', '需要 AF 授权时打开；打开后点击 AF 产品线并填写参数', '关闭时 AF 不参与本单；XDR 和 STA 仍按方案范围参与。'],
        ['分布式安全运营方案的 aES', '关闭', '需要 aES 授权时打开；打开后填写 aES 参数', '关闭时 aES 不参与本单。'],
        ['全球组网方案的 SASE-SWG', '关闭', '需要互联网安全访问时打开', '关闭时不参与校验、授权和记录明细。'],
    ], widths=[2.35, 1.1, 2.7, 2.0])
    add_heading(doc, '6.2 模块卡操作', 2)
    add_numbered(doc, [
        '点击产品线名称进入对应授权参数面板。',
        '核对版本和只读授权有效期。',
        '点击模块卡头部展开参数，按字段说明填写数量、日期、规格或开关。',
        '需要本次授权的模块保持启用；不参与本次申请的可选模块保持关闭。',
        '切换到下一条产品线重复填写，直到所有启用产品线的必填项完成。',
    ])
    add_note(doc, '日期填写原则：', '模块日期通常是授权结束日期，不能晚于方案统一授权结束日期；Mock 页面中的 2026 年日期是演示默认值，实际操作以当前方案授权时间和业务规则为准。')
    add_heading(doc, '6.3 提交前的模块检查', 2)
    add_bullets(doc, [
        '每条启用产品线都有版本、授权有效期和产品规定的身份字段。',
        '设备线的设备 ID、HCI/SCP 的硬件信息文件和集群标识已完成。',
        'XaaS 线的云图 ID 已自动关联或完成多账号选择。',
        '数字字段为正数，日期字段格式正确，选择项没有停留在“请选择”。',
        '业务申请信息与产品参数描述的是同一个客户项目，不使用无关 Mock 文案提交真实业务。',
    ])


def chapter_seven(doc):
    add_heading(doc, '第七章 提交审批和授权结果', 1)
    add_heading(doc, '7.1 提交前校验', 2)
    add_table(doc, ['检查项', '系统判断', '不通过时的处理'], [
        ['入口和方案', '已选择授权类型，并已关联有效借测单或启用本地方案', '返回基本信息补齐入口或方案。'],
        ['客户身份', '客户名称已选择；含 XaaS 时具有云图账号和云图 ID', '重新选择客户或选择云图账号。'],
        ['方案范围', '方案和产品线存在且为只读快照', '返回资产系统核对借测单申请内容。'],
        ['业务信息', '特定方案的必填业务字段和材料齐全', '按第三章字段说明补全。'],
        ['产品参数', '所有启用产品线的必填参数齐全', '按产品线逐条定位并补齐。'],
    ], widths=[1.55, 3.55, 3.05])
    add_heading(doc, '7.2 审批执行', 2)
    add_numbered(doc, [
        '点击“提交 W3 整单审批”。校验通过后，整套方案作为一张申请单进入 W3 审批。',
        '审批人查看方案基本信息、借测信息、业务申请信息、产品线和授权参数，按整单通过或驳回。',
        '任一节点驳回时，整单进入“W3 审批已驳回”，申请人修改后重新提交；驳回不会执行产品授权。',
        '全部审批节点通过后，系统对所有启用产品线执行授权预校验和实际授权。',
        '只有所有产品授权成功时，整单状态才变为“已授权”；任一产品失败时整单失败并回滚本次已成功产品。',
    ])
    add_note(doc, '审批链说明：', '当前页面已落地的是 W3 整单审批和状态展示。具体审批节点数量、审批人和区域人员映射，应以业务最终确认的审批规则为准；不要把 Mock 页面中的状态文案理解为固定人员链路。')
    add_heading(doc, '7.3 驳回后重新提交', 2)
    add_bullets(doc, [
        '打开被驳回申请或从授权记录进入详情，先阅读审批意见。',
        '只修改审批意见涉及的字段，保持方案范围和产品线不变。',
        '重新完成必填校验后提交；审批通过前不会生成可用授权码。',
    ])


def chapter_eight(doc):
    add_heading(doc, '第八章 授权记录查询', 1)
    add_heading(doc, '8.1 查找解决方案记录', 2)
    add_numbered(doc, [
        '进入“授权记录”页，可按申请编号、方案名称、客户、借测单号或产品线筛选。',
        '解决方案主记录以 SOL 开头，并标记“解决方案”授权类型。',
        '查看整体状态。只有“已授权”状态才表示整套方案的产品授权均可交付。',
        '点击主记录左侧展开按钮，查看方案内每个产品线的版本、设备 ID 或云图 ID、设备 SN、授权有效期和授权码。',
    ])
    add_heading(doc, '8.2 主记录和明细字段', 2)
    add_table(doc, ['层级', '字段', '含义'], [
        ['主记录', '申请编号、授权类型、方案名称、客户、设备数量、授权有效期、申请人、申请时间、状态', '展示整套方案的申请和授权结果。'],
        ['设备明细', '产品线、版本、设备 ID、设备 SN、授权有效期、授权码', '设备产品线使用设备身份。'],
        ['XaaS 明细', '产品线、版本、云图 ID、授权有效期、授权码', 'XaaS 产品线使用客户云图身份，不展示设备 ID/SN。'],
    ], widths=[1.25, 3.25, 3.65])
    add_heading(doc, '8.3 记录操作边界', 2)
    add_bullets(doc, [
        '产品明细不是独立授权记录，不能按产品线拆成多条解决方案记录。',
        '纯软件方案支持整套复制申请和一键续期时，系统回填整套方案内容，不支持只选择其中几个产品。',
        '含硬件方案的延期、归还和资产状态以新资产系统为准；W3 不修改借测单。',
        '记录显示“整单失败”时，不要使用失败记录中的授权码；应查看失败产品和回滚结果。',
    ])


def chapter_nine(doc):
    add_heading(doc, '第九章 Mock 数据和演示步骤', 1)
    add_para(doc, '以下数据来自当前 V2 原型代码中的方案配置、客户和借测单。它们只用于复现页面交互和字段状态。演示时建议从客户下拉中选择名称，不要只手工输入客户文本。', first_indent=True)
    add_heading(doc, '9.1 方案配置 Mock', 2)
    add_table(doc, ['方案编码', '方案名称', '关联产品线', '授权天数', '状态'], [
        ['SOL-CLOUD-001', '企业云一体化方案', 'HCI、AC、NGAF、AD、WOC、SaaS-XDR', '90', '启用'],
        ['SOL-SEC-002', '安全态势感知方案', 'XDR、NGAF、WAF', '60', '启用'],
        ['SOL-XAAS-004', '云网安全运营方案', 'SASE-GA、SaaS-XDR', '30', '启用'],
        ['SOL-GLOBAL-005', '全球组网方案', 'AF、SASE-GA、SASE-SWG', '30', '启用'],
        ['SOL-ACCEL-006', '全球加速方案 SaaS 版', 'SASE-ZTNA、SASE-GA', '30', '启用'],
        ['SOL-ACCEL-007', '全球加速方案 本地版', 'aTrust、SASE-GA', '30', '启用'],
        ['SOL-DSOC-008', '分布式安全运营方案', 'XDR、STA、AF、aES', '30', '启用'],
        ['SOL-LEGACY-003', '旧版云安全方案', 'HCI、WAF', '15', '停用'],
    ], widths=[1.35, 1.65, 2.65, 0.85, 0.85], font_size=8.8)
    add_heading(doc, '9.2 方案客户 Mock', 2)
    add_table(doc, ['客户编码', '客户名称', '类型', '销售负责人', '云图身份'], [
        ['C100101', '华东智造集团有限公司', 'KA', '周青', 'huadong-admin / YT-10010101'],
        ['C100102', '北辰智慧能源有限公司', '普通', '赵凯', '无'],
        ['C100103', '苏州新零售集团有限公司', 'KA', '林舟', '无'],
        ['C100104', '西南智慧物流有限公司', '普通', '陈颖', '无'],
        ['C100105', '星澜数字服务有限公司', '普通', '沈思', '无'],
        ['C100106', '星海智联科技有限公司', 'KA', '许岚', 'xinghai-admin / YT-10010688'],
        ['C100107', '环球致远贸易有限公司', 'KA', '宋雨', 'global-admin / YT-10010777'],
        ['C100108', '环宇速联科技有限公司', 'KA', '宋雨', 'oceanlink-admin / YT-10010888'],
        ['C100109', '明澈水务集团有限公司', 'KA', '许岚', 'mingche-admin / YT-10010999'],
    ], widths=[1.0, 2.35, 0.8, 1.0, 2.4], font_size=8.8)
    add_heading(doc, '9.3 借测单 Mock', 2)
    add_table(doc, ['借测单号', '客户', '方案', '状态', '设备或云图信息'], [
        ['BOR-202608-001', '华东智造集团有限公司', '企业云一体化方案', '审批通过，借测中', 'HCI GW-HCI-208 等设备；云图 YT-10010101'],
        ['BOR-202608-002', '北辰智慧能源有限公司', '未审批示例', '审批中', '不可关联'],
        ['BOR-202608-003', '苏州新零售集团有限公司', '历史状态示例', '已归还', '不可关联'],
        ['BOR-202608-004', '西南智慧物流有限公司', '历史状态示例', '已撤销', '不可关联'],
        ['BOR-202608-005', '星海智联科技有限公司', '云网安全运营方案', '审批通过，借测中', '云图 YT-10010688'],
        ['BOR-202608-006', '环球致远贸易有限公司', '全球组网方案', '审批通过，借测中', 'AF GW-AF-930；云图 YT-10010777'],
        ['BOR-202608-007', '环宇速联科技有限公司', '全球加速方案 SaaS 版', '审批通过，借测中', '云图 YT-10010888'],
        ['BOR-202608-008', '明澈水务集团有限公司', '分布式安全运营方案', '审批通过，借测中', 'AF GW-AF-771、STA GW-STA-352、aES GW-aES-483；云图 YT-10010999'],
    ], widths=[1.25, 1.85, 1.8, 1.25, 2.0], font_size=8.4)
    add_heading(doc, '9.4 推荐演示组合', 2)
    add_table(doc, ['演示场景', '客户和操作', '重点观察'], [
        ['全球组网', '选择 C100107 环球致远贸易有限公司，选择 BOR-202608-006，点击查询并关联', '业务信息三字段；AF 参数；SASE-GA 五档带宽；SASE-SWG 默认关闭，打开后才参与整单。'],
        ['全球加速 SaaS 版', '选择 C100108 环宇速联科技有限公司，选择 BOR-202608-007', 'SASE-ZTNA 用户数、SASE-GA 带宽、业务信息共享模块。'],
        ['分布式安全运营', '选择 C100109 明澈水务集团有限公司，选择 BOR-202608-008', '业务申请信息、XDR 单一版本、AF 和 aES 可选开关、STA 设备线。'],
        ['企业云一体化', '选择 C100101 华东智造集团有限公司，选择 BOR-202608-001', 'HCI/AC/NGAF/AD/WOC 与 SaaS-XDR 设备线和 XaaS 线并存。'],
        ['纯软件本地申请', '切换授权类型为纯软件本地申请，选择启用方案和带云图身份的客户', '不填写借测单；含 XaaS 时必须选择或自动关联云图身份。'],
    ], widths=[1.25, 2.9, 3.9], font_size=8.8)
    add_heading(doc, '9.5 HCI 和 SCP 文件 Mock', 2)
    add_table(doc, ['文件', '用途', '页面识别结果'], [
        ['02-原型/app/mock-data/HCI-device-demo.info', 'HCI 首次场景', '无历史授权，按首次识别。'],
        ['02-原型/app/mock-data/HCI-active-demo.info', 'HCI 有效期内调整', '识别有效授权、集群 CLUSTER-HCI-ACTIVE、容量 16。'],
        ['02-原型/app/mock-data/HCI-expired-demo.info', 'HCI 重新开通', '识别过期授权、集群 CLUSTER-HCI-EXPIRED、容量 12。'],
        ['02-原型/app/mock-data/SCP-device-demo.info', 'SCP 首次场景', '无历史授权，按首次识别。'],
    ], widths=[2.5, 2.1, 3.45], font_size=9)
    add_note(doc, 'Mock 文件说明：', '当前原型主要按文件名识别演示变体，不能据此判断生产系统会解析同样内容。')


def chapter_ten(doc):
    add_heading(doc, '第十章 常见问题和处理', 1)
    add_table(doc, ['现象', '原因', '处理方式'], [
        ['借测单下拉为空', '尚未选择客户，或该客户没有可关联借测单', '先选择客户；确认借测单属于当前客户。'],
        ['无法关联借测单', '借测单未审批通过、已归还、已撤销或查询失败', '回资产系统核对状态；查询失败时稍后重试，不要绕过校验。'],
        ['方案范围无法修改', '方案和产品线是资产审批或启用配置的只读内容', '返回资产系统修改审批内容，或选择正确的本地方案。'],
        ['XaaS 提示缺少云图账号和云图 ID', '客户没有云图身份或多账号未选择', '重新选择有云图身份的客户；多个账号时选择对应账号。'],
        ['产品线面板字段不完整', '可选产品线开关关闭，或当前产品线尚未定位', '先打开产品线开关，再点击左侧产品线名称；核对是否进入正确方案。'],
        ['提交提示业务申请信息不完整', '特定方案的必填字段或材料为空', '按第三章对应方案逐项补齐，特别检查文件上传字段。'],
        ['提交提示产品参数不完整', '某个启用产品线缺少版本、身份、模块或规格', '按左侧产品线逐一检查，不要只检查当前面板。'],
        ['记录为整单失败', '至少一个产品授权失败并触发整单回滚', '不要使用授权码；打开详情查看失败信息并联系平台支持。'],
    ], widths=[1.8, 2.7, 3.55], font_size=8.9)
    add_heading(doc, '10.1 业务填写原则', 2)
    add_bullets(doc, [
        '客户、借测单、设备 ID、云图 ID 和项目材料必须属于同一个实际项目。',
        '页面默认值只用于演示或减少重复输入，提交真实业务前必须替换为真实信息。',
        '方案范围和产品线是只读业务边界，不能通过产品参数字段改变。',
        '业务信息与授权参数要保持一致，例如项目规模中的用户数应与 SASE-ZTNA 或 AF 的授权规模相互匹配。',
    ])
    # Keep the final checklist together so its last row is not orphaned on a new page.
    doc.add_page_break()
    add_heading(doc, '10.2 快速提交清单', 2)
    add_table(doc, ['检查顺序', '确认内容'], [
        ['1', '授权类型正确；关联借测单已审批通过且未归还、未撤销，或已选择启用本地方案。'],
        ['2', '客户已通过下拉选择；客户类型和销售负责人显示正确。'],
        ['3', '含 XaaS 时云图账号和云图 ID 已关联。'],
        ['4', '方案范围中的方案、产品线和授权时间与预期一致。'],
        ['5', '方案级业务申请信息已按场景填写，文件材料已上传。'],
        ['6', '所有启用产品线的版本、身份、模块和规格字段已填写。'],
        ['7', '可选产品线开关状态正确，关闭的产品线不应出现在本次授权明细中。'],
        ['8', '点击提交后查看状态；授权成功后到授权记录展开 SOL 主记录。'],
    ], widths=[0.65, 7.4], font_size=9.2)
    add_para(doc, '本手册对应的页面源文件为项目内“02-原型/app/测试设备授权平台V2.html”。如页面字段、选项或方案配置发生变化，应以最新页面和已确认业务规则为准，并同步修订本手册。', size=9.5, color=MID_GRAY, first_indent=False, before=9, after=0)


def build():
    doc = Document()
    setup_document(doc)
    add_title(doc)
    chapter_one(doc)
    chapter_two(doc)
    chapter_three(doc)
    add_heading(doc, '第四章 产品授权参数字段', 1)
    add_device_line_tables(doc)
    add_xaas_tables(doc)
    chapter_six(doc)
    chapter_seven(doc)
    chapter_eight(doc)
    chapter_nine(doc)
    chapter_ten(doc)
    doc.core_properties.title = '方案型授权操作手册'
    doc.core_properties.subject = 'W3 测试授权平台字段填写与审批操作说明'
    doc.core_properties.author = 'W3 测试授权平台'
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT)
    print(OUT)


if __name__ == '__main__':
    build()
