/**
 * LOOP 节点6 线索板配置
 * 论文元数据 + 附录 A-J 与未编号附录？ 配置。
 * 密码只存储 sha256 摘要（校验失败不回显明文），解锁成功才返回正文。
 * 正文以 PDF 呈现：附录 PDF 由服务器端 PyMuPDF 预渲染为 PNG 页面图，
 * 存放于 server/uploads/loop6_appendix/<key>/<n>.png，经鉴权路由分发。
 *
 * 注意：key 与素材 PDF 内的附录标签一一对应（2026-08 结构调整后）：
 *   A=附录A「日记」           B=附录B「AWE-S 量表结构」   C=附录C「遗忘终究遇见」
 *   D=附录D「遇见终究遗忘」   ?=附录？「Fig.1」
 *   E=附录E「语言、预言、寓言」  F=附录F「必然的循环」  G=附录G「无解死局」
 *   H=附录H「为明天占卜」      I=附录I「终端」            J=附录J「一角」
 * 其中 A/B/C/D/? 为一开始即解锁的附录（defaultUnlocked），无密码；E-J 使用密码解锁。
 * 展示顺序（2026-08-26）：？置于首位（左上角第一张卡），A-J 依次顺延。
 */

export interface LoopAppendix {
  key: string;          // 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | '?'
  title: string;        // 卡片标题
  subtitle: string;     // 卡片副题/线索提示
  passwordHash: string; // sha256 摘要（对原始密码原文哈希）；defaultUnlocked 附录为空串
  defaultUnlocked?: boolean; // 一开始即解锁，无需密码
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
    key: '?',
    title: '无题附录',
    subtitle: 'Fig. 1 —— 仅此一图，再无文字。',
    passwordHash: '',
    defaultUnlocked: true,
  },
  {
    key: 'A',
    title: '日记',
    subtitle: '在文明逐步走向消亡的时候，我也曾在高山与河流之间记录下诗歌。',
    passwordHash: '',
    defaultUnlocked: true,
  },
  {
    key: 'B',
    title: 'AWE-S 量表结构',
    subtitle: '敬畏体验的六个维度，量表测量的标准化框架。',
    passwordHash: '',
    defaultUnlocked: true,
  },
  {
    key: 'C',
    title: '遗忘终究遇见',
    subtitle: '至少我们脚下的土壤是实的，不是吗？',
    passwordHash: '',
    defaultUnlocked: true,
  },
  {
    key: 'D',
    title: '遇见终究遗忘',
    subtitle: '终端，这是你唯一看到的东西。',
    passwordHash: '',
    defaultUnlocked: true,
  },
  {
    key: 'E',
    title: '语言、预言、寓言',
    subtitle: '语言是文明的骨骼。',
    passwordHash: '2c5ed5c852884ad51738b5c7ca41b231df516e6f00cd761fe814041e137d57eb',
  },
  {
    key: 'F',
    title: '必然的循环',
    subtitle: '循环在一切学科的尽头等待。',
    passwordHash: '3d31cd1845838fe7803efea0f0aebd3374d11b5302a6577fda2e4a2a9cb6f592',
  },
  {
    key: 'G',
    title: '无解死局',
    subtitle: '推石上山，伐桂千年。',
    passwordHash: '2fc7ab032c362191d0ecb1f301689779a6669cc68aab53106492d771d920828b',
  },
  {
    key: 'H',
    title: '为明天占卜',
    subtitle: '塔罗七十八张，命运之轮永无休止。',
    passwordHash: 'ed9aff287e0d30ad3ad7cd105530dc77f6ba83d83c72de27476be7bc914e8dea',
  },
  {
    key: 'I',
    title: '终端',
    subtitle: 'T.E.R.M.I.N.A.L. —— 我只是在记录。',
    passwordHash: '1d46a143c906ea4e2571a905a2b6e1d5fd838c404507c009df2cb79a2cb91662',
  },
  {
    key: 'J',
    title: '一角',
    subtitle: '写在实验报告背面的、手写的记录。',
    // 明文：WDSJ225772937AAAB（校验时统一转大写后比对 sha256）
    passwordHash: '0a96da1a7183a2d249771f93796e81475198754beac0c21850be04a2d6be1954',
  },
];
