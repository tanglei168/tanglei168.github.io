// ASCII tokens matched with word boundaries; CJK tokens matched as substrings.
const ASCII_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'bastard', 'damn',
  'viagra', 'casino', 'porn', 'xxx',
]

const CJK_WORDS = [
  '操你', '草你', '艹你', '傻逼', '煞笔', '弱智', '智障', '滚蛋',
  '妈的', '他妈的', '去死', '废物', '垃圾人',
  '赌博', '博彩', '澳门赌场', '一夜情', '色情', '黄片',
  '加我微信', '加我QQ', '免费领取', '高额回报', '稳赚不赔', '兼职刷单',
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
}

export interface FilterResult {
  ok: boolean
  hit?: string
}

export function checkSensitive(text: string): FilterResult {
  const n = normalize(text)
  for (const w of ASCII_WORDS) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(n)) return { ok: false, hit: w }
  }
  for (const w of CJK_WORDS) {
    if (n.includes(w)) return { ok: false, hit: w }
  }
  return { ok: true }
}
