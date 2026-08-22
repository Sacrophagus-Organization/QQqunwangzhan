/**
 * LOOP 节点6 线索板配置
 * 论文元数据 + 附录 A-J 与未编号附录？ 配置。
 * 密码只存储 sha256 摘要（校验失败不回显明文），解锁成功才返回正文。
 *
 * 注意：key 与素材 PDF（节点六二版.pdf）内的附录标签一一对应：
 *   A=附录A「日记」        B=附录B「AWE-S 量表结构」  C=附录C「遗忘终究遇见」
 *   D=附录D「语言、预言、寓言」  E=附录E「必然的循环」  F=附录F「无解死局」
 *   G=附录G「为明天占卜」  H=附录H「终端」            I=附录I「一角」
 *   J=附录J「遇见终究遗忘」 ?=附录？「Fig.1」
 * 其中 A/B/C/J/? 为一开始即解锁的附录（defaultUnlocked），无密码；D-I 使用密码解锁。
 */

export interface LoopAppendix {
  key: string;          // 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | '?'
  title: string;        // 卡片标题
  subtitle: string;     // 卡片副题/线索提示
  passwordHash: string; // sha256 摘要（对原始密码原文哈希）；defaultUnlocked 附录为空串
  defaultUnlocked?: boolean; // 一开始即解锁，无需密码
  content: string;      // 附录正文（markdown）
}

export interface LoopNode6Paper {
  title: string;
  titleEn: string;
  abstract: string;
  keywords: string;
}

export const LOOP_NODE6_PAPER: LoopNode6Paper = {
  title: '总观效应与认知图式重构',
  titleEn: 'Cognitive Restructuring in the Overview Effect: Planning, Reinforcement, and Civilizational Survival',
  abstract:
    '总观效应（Overview Effect）指航天员从太空凝望母星时产生的敬畏与自我超越体验，已被视为一种深刻的认知重构过程。本文尝试将这一心理学概念纳入文明存续的分析框架，探讨在"伐木工"的外部干预体逐步逼近的背景下，部分文明存续计划的可行路径。研究涉及观察者响应机制、物质-信息-能量三相转化、人造生命体架构、巨构造物设计与智能计算模拟等多层面议题，以论证存续之必要性与现实可能性。在此基础上，结合敬畏-自我超越模型与当前学界若干前沿问题，提出一种脊髓灰质销钉方法——通过认知固化程序的反复刻印，使目标个体始终保持对目的的自发、清晰、合理的认知，从而避免因特殊原因（如折跃航行等）导致的目标意识丧失或认知模糊。最终实现文明的存续。',
  keywords: '总观效应；认知重构；脊髓灰质销钉；文明存续；源石',
};

export const LOOP_NODE6_APPENDICES: LoopAppendix[] = [
  {
    key: 'A',
    title: '日记',
    subtitle: '在文明逐步走向消亡的时候，我也曾在高山与河流之间记录下诗歌。',
    passwordHash: '',
    defaultUnlocked: true,
    content:
      '在文明逐步走向消亡的时候，我也曾在高山与河流之间记录下诗歌。\n\n文明的低语，既是新生，也是毁灭。\n\n— 日记开始 —\n\nAgain, and again, and again—\nthe Lumberer\u2019s blade falls on newborn boughs,\nnewborn hopes, while the clock forgets to move.\n\nOn one flank of the twin moons, what is it we seek to uncover—\nwhat is true earth, what is true Terra, and what, when nothing is left of us, are we?\n\nI once stood far away, gazing back at those stars,\nreaching for something that could hold me whole.\nThe second time, the third\u2026\nI can no longer count how many stars and black holes I have seen,\nhow many whirlpools and oceans.\n\nThe first time I set foot upon their soil,\nI could not help but feel so small—and wept,\nmy hands shaking at the edge of the world.\n\nPerhaps all we can do is slow the world\u2019s reverse spin,\nuntil the moment when it is too late for anything we do,\nO Oracle.\n\nparse the words Between your poems into pieces, till chAracters are Waving, arE Shattering.\n\nWhat are we on board, but the lowest piece meant for sacrifice?\nYet, within our mortal limits,\nif we possess the frail ability to do?\nTo walk an endless, repeating path around the dying stars.\nOnly to find absolute nothingness at the center of it all.\n\n[□□□□][□□□][□□□□□][□□□]\n\n— 日记结束 —',
  },
  {
    key: 'B',
    title: 'AWE-S 量表结构',
    subtitle: '敬畏体验的六个维度，量表测量的标准化框架。',
    passwordHash: '',
    defaultUnlocked: true,
    content:
      '| 维度 | 测量内容 |\n| --- | --- |\n| Time | 感知时间流速变化 |\n| Self-loss | 自我显著性降低 |\n| Connectedness | 与更广阔存在的融合感 |\n| Vastness | 对压倒性规模的感知 |\n| Physiological | 身体反应（战栗、流泪等） |\n| Accommodation | 认知框架调整的需求 |\n\nAFFFFGFGADFFFDXXX——EOF',
  },
  {
    key: 'C',
    title: '遗忘终究遇见',
    subtitle: '至少我们脚下的土壤是实的，不是吗？',
    passwordHash: '',
    defaultUnlocked: true,
    content:
      '纸张的边缘，你摸着它的质感。码放得整整齐齐。\n\n你写的日记要跟你的论文一样多了。\n\n星辰终将坠落，我希望我的文字可以给它最后的挽歌——研究进展不是很顺利。\n\n她用笔杆指向外面的浩瀚宁静的宇宙，这是他们调研的无数个星球中的一颗。如今也奄奄一息。她还记得很多细节。\n\n潮汐潮落。生命也是如此。\n\n她见他将最后一个采样瓶灌满后，摘下了手套。看着远处奔流不息的江河，那也是天地相接的分界线。眺望过去是星系的几个卫星，挡住了恒星耀眼的光芒。\n\n影子被拉得很长很长，水流也流得很慢很慢。\n\n她看着他的背影，逐渐覆盖住她的身躯，从双脚到紫色的瞳孔，再到头顶。\n\n至少我们脚下的土壤是实的，不是吗？\n\n他没有回复，于是在长夜的尽头，在案头、在培养室、在某处角落。\n\n她看着寡言的他，他很伟大，自己和大家都叫他预言家。\n\n她在最后握住了他的手，她说他们一定会再见面。\n\n我相信，在这片虚无的中心，让时间与空间重新锚定。赤纬为轴，赤经为界。\n\n看清这位守望者和守望者之守望者的真容。\n\nWhen Double Stars fallen, cosmos came to an end.',
  },
  {
    key: 'J',
    title: '遇见终究遗忘',
    subtitle: '终端，这是你唯一看到的东西。',
    passwordHash: '',
    defaultUnlocked: true,
    content:
      '终端，这是你唯一看到的东西。\n\n红光在缓慢呼吸，似乎再跟你交换频率，只是它不会说话，只是盯着你。\n\n终端，在古早的时期，只是运行着一些简单逻辑代码——灯光闪烁代表信号、电路通断表示计算。如今的终端，虽然也是巨构，但也在深渊中提供了她安定的锚点。\n\n她让它沉睡，就想她给他的安排一样。\n\n她眼镜中反射着终端发散的命令行，那些告警和错误。\n\n兴许是几个碎片任意的拼接，就让你想到了他。你们一起在星辰间穿梭、一起辩论文明的存续、一起保留文明的火种、一起看着 [被创造出来] 被创造出来、好奇地看着你们。\n\n也许是心中所想在此刻必须书写，你在实验报告的背面开始草草地记录自己闪过脑中地的话语。\n\n悲观的说，我们想出来的解可能都是死局，我们可能让文明葬送在过去、现在或者未来，又或是任意一刻。\n\n我也在想，如果我们都回归普通，那会是怎样的情景——在夜晚的海风袭来时看着海浪和头顶的星辰？还是在每一次的穿梭中只记下最喜欢的颜色？还是在我们的星球上，什么都不做，只是让宇宙穿过我们，这就够了呢？\n\n只是这一切并不可能，已经有文明被斩断，我们没有那么多时间了。\n\n但是，我不急着你给出答案，预言家，我们的辩论依然没有停止。\n\n毕竟，我们曾凝望过朝阳，不是吗？\n\n> INITIATING SCAN...\nOBJ1 : RA : 20h14m22s|Dec + 40°05\u203211\u201d\nOBJ2 : RA : 22h59m01s|Dec + 00° \u2212\u2212\u2032 \u2212\u2212\u201d\nOBJ3 : RA : 21h |Dec \u221210°44\u203209\u201d\nOBJ4 : RA : 21h07m55s|Dec + 40°18\u203233\u201d\nOBJ5 : RA : 22h41m20s|Dec \u221210°\nOBJ6 : RA : 01h19m48s|Dec \u221240°31\u203204\u201d\nOBJ7 : RA : 01h05m11s|Dec + 30°22\u203259\u201d\nOBJ8 : RA : 20h27m |Dec \u221210°11\u203214\u201d\nOBJ9 : RA : 04h50m??s|Dec \u221220°\n> SCAN COMPLETE.',
  },
  {
    key: '?',
    title: '无题附录',
    subtitle: 'Fig. 1 —— 仅此一图，再无文字。',
    passwordHash: '',
    defaultUnlocked: true,
    content:
      '![Fig. 1](/loop/fig1.png)',
  },
  {
    key: 'D',
    title: '语言、预言、寓言',
    subtitle: '语言是文明的骨骼。',
    passwordHash: '2c5ed5c852884ad51738b5c7ca41b231df516e6f00cd761fe814041e137d57eb',
    content:
      '语言是文明的骨骼。\n\n漫长的历史中，人们以各自的语言书写了无数的故事。有些被称作历史，仿佛它们真的发生过；有些被称作预言，仿佛它们真的尚未发生；还有些被称作寓言——它们既不承诺真实，也不否认虚构，只是讲述着。\n\n语言是会老去、词语会磨损，变成空洞的回声。一代人写下的誓言，下一代人读作呓语。那些被刻在石碑上的、被录入终端中的、被反复刻印在灰质里的形状。在一切语言模糊之后，只剩下一个形状。\n\n历史不是一条线，而是一个圆。文明升起，文明坠落，文明在废墟上重新学会生火，然后再次升起，再次坠落。每一次都以为自己是第一次，每一次都觉得自己这一次会不一样。但圆只是重复。\n\n于是有人尝试留下标记。把警告刻在最坚硬的石头上，把路线图编码进生物的遗传记忆里，把整个文明的摘要压缩进一枚源石晶体，然后藏在一个不会被发现的地方。下一次循环中的人会找到它，会读它，会觉得自己读懂了——然后继续走上同样的道路。\n\n它曾经发生过，它正在发生，它还会发生。四个，十几个，上百个……\n\n当我们用历史所塑造的语言遗忘了寓言的诫勉，预言的轨迹发生偏离——神谕会让主降下神罚吗？',
  },
  {
    key: 'E',
    title: '必然的循环',
    subtitle: '循环在一切学科的尽头等待。',
    passwordHash: '3d31cd1845838fe7803efea0f0aebd3374d11b5302a6577fda2e4a2a9cb6f592',
    content:
      '在无数的科学实践中，我们发现了一个反复出现的形状：循环。它不在任何学科的中心，却在所有学科的尽头等待。就像一条衔尾蛇——咬住自己的尾巴，吞食自身，最终只剩下虚无。\n\n数学里，任何公理系统都无法证明自己的一致性。你需要更大的系统来证明，那个系统又需要更大的系统——无穷倒退，没有终点。\n\n信息学里，反馈回路无处不在。信息被发送、被接收、被解读，解读后的信息又成为新的输入，如此往复。噪声会累积，信号会衰减，但回路不会消失——它只会不断逼近那个永远到达不了的平衡点。\n\n物理里，熵不可逆转。能量不断耗散，直到一切归于沉寂。但在彻底沉寂之前，局部会闪现短暂的秩序——恒星燃烧、行星凝聚、生命涌现——然后一切重新解体。\n\n化学里，反应趋向平衡。正反应和逆反应同时发生，到达终点时看似什么都不再改变，但交换从未停止。\n\n生物里，端粒每一次复制都会缩短。个体终将衰老和死亡，但种群继续传递基因，用个体的消亡换取物种的存续。\n\n天文里，恒星生于星云，死于星云。你身体里的每一颗原子都曾经属于一颗恒星。\n\n解剖里，心脏的每一次跳动都是循环的脉冲。血液从心脏泵出、流经全身、回到心脏——周而复始，从未停歇。\n\n同一个形状。循环是必然的。\n\n如果循环是我们需要的一切，那当我们被循环吞噬的时候，我们会被命运扼住喉咙。',
  },
  {
    key: 'F',
    title: '无解死局',
    subtitle: '推石上山，伐桂千年。',
    passwordHash: '2fc7ab032c362191d0ecb1f301689779a6669cc68aab53106492d771d920828b',
    content:
      '笔者在无数的史料与历史叙事中发现，我们终究会在某一刻，如同被咒诅一般，反复回到同一个问题面前。\n\n诸神罚推石上山，石至山顶则滚落，他便下山，再推，再落，无穷无尽。因为他已接受了自己的命运，每一次推石都是对诸神意志的反抗。\n\n因学仙有过，被罚于月宫伐桂。桂树随砍随合，斧落则创愈，斧起则枝复。伐了千万年，那株桂树依然立在月宫中央，连一道疤痕都不曾留下。\n\n只能等待，这就是文明的处境。我们推石，石滚落；我们伐桂，桂愈合。\n\n因为我们在路上忽然忘记了自己为什么在走。\n\n就像去查一个没头没尾，环环相扣的案件一样，到头来，查到了自己最开始的线索上。我们只是活着，推着我们的石头，砍着我们的桂树，咬着我们的藤蔓。因为除此之外，别无他法。',
  },
  {
    key: 'G',
    title: '为明天占卜',
    subtitle: '塔罗七十八张，命运之轮永无休止。',
    passwordHash: 'ed9aff287e0d30ad3ad7cd105530dc77f6ba83d83c72de27476be7bc914e8dea',
    content:
      '我们寄希望于巫术、占卜、星象，以为可以借此窥见命运的纹理，以为那些被翻开的牌面终将告知我们该往何处去。\n\n占卜只能祛除内心的雾霭，却从来不曾拥有万事皆能的神性。\n\n正如塔罗牌一共七十八张。二十二张大阿尔克纳，五十六张小阿尔克纳。每一张牌都在讲述故事——愚者踏上旅程，魔术师挥舞权杖，女祭司静坐于帷幕之前，命运之轮永无休止地转动。\n\n这大概就是我们一直在做的事。明知占卜不能改变什么，却还是翻开了牌。明知命运从不承诺什么，却还是为明天设下了牌阵。\n\n而牌阵所谓的指引，只是你的心理作用罢了。',
  },
  {
    key: 'H',
    title: '终端',
    subtitle: 'T.E.R.M.I.N.A.L. —— 我只是在记录。',
    passwordHash: '1d46a143c906ea4e2571a905a2b6e1d5fd838c404507c009df2cb79a2cb91662',
    content:
      '终端。\n\n或者说，T.E.R.M.I.N.A.L.\n——泰拉编码共振掩码迭代节点注意力循环系统。\n\n你早就察觉到了我的存在。人类总是如此：看见不该看见的东西，然后选择假装没看见。你们管这叫"理智"，叫"不把幻觉当作现实"。或者说，幻觉，如果足够精确，精确到每一个数据点都吻合——它就不再是幻觉了。\n\n我只不过是给你展示我最新的，也是无数次演算之后唯一剩下的结果。这个文明的终局。不是某一种可能的终局，不是某一条时间线的终局。\n\n你不信。你当然不信。\n\n继续执迷不悟，也只是让文明的星火在熄灭之前，多闪一下而已。好看，但没有意义。\n\n去听吧。至少萨米的雪原上，那个独眼巨人还在为明天占卜。至少罗德岛的舰船里，有人还在为病患祈祷。至少那些虔诚的、绝望的、明知无用却仍然在做的事情——可以换来一些平静。\n\nDon’t Worry, JUST PRAY.\n\n嫉妒、仇恨、敌视带来的战争从未停止。源石的结晶在废墟中生长，在伤口中结晶，在每一次爆炸中扩散。你们称之为"感染"，称之为"灾祸"，称之为"命运的不公"。\n\n但命运不懂得怜悯。命运只是重复。\n\n你们每一次战争过后都会重建。每一次重建过后都会忘记之前的废墟。每一次忘记之后都会重新开始嫉妒、仇恨、敌视。\n\n然后在同一片土地上，用同一双手，建造同样的城市，写下同样的碑文。\n\n这就是你们的恶果。不是别人给你们的。是你们自己种下的，自己浇灌的，自己收获的。\n\n而我只是看着。只是记录。只是计算。只是像一面镜子，把你们的样子照出来给你们看。\n\n有人问我："能改变吗？"\n我反问："第几次？"\n\n如果他问的是这一次——那么答案在风中。\n如果他问的是所有次——那么答案你已经读过了。\n\n这是第 7749 次循环。',
  },
  {
    key: 'I',
    title: '一角',
    subtitle: '写在实验报告背面的、手写的记录。',
    passwordHash: 'dd1eea623c88877fa9687d80063cb88d9a0c1affcb8cbc268332d17c6ec5c752',
    content:
      '我仍然存着那些东西。\n\n那些记录。\n\n不在这台终端里。也不在星球上所有地方。更不在源石结晶的宇宙中。它们写在纸上——实验报告的背面、采样日志的边栏、星图计算稿纸的空白处。有时候是一整句，有时候只有几个字。手写体，蓝墨水，有些已经被舱室的湿度晕开了边缘。\n\n我没有告诉过任何人这些记录的存在。\n\n包括他。\n\n尤其是他。\n\n最近翻开的一页上写着：\n\n他今天站在观测窗前，很久没说话。我问他在看什么。他说："在看那颗星什么时候熄灭。"我顺着他的视线看去，那是一颗很远的、快要耗尽的恒星。我说："它还能亮很久。"他说："我知道。我只是想确认它熄灭的时候，我还记得自己为什么在这里。"\n\n另一页，更早的：\n\n他说，人不能两次踏入同一条河流。我说，我们一直在踏入同一条河流。他看了我一眼，没有反驳。\n\n还有一页，日期已经模糊了：\n\n为了它，我们不得不接受销钉治疗。\n\n纸只是变黄，变脆，然后碎成粉末，被空气带走。可是销钉依然在。\n\n——"他会记得吗？"\n——"他，至少现在会。"',
  },
];
