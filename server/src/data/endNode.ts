// 节点0 终局谜题 —— 敏感配置
// 所有密码仅以 sha256 哈希形式存在，源码中不出现明文。
// 正文数据（回响手稿 / 真·假结局手稿）在 end-content.ts（由原 HTML 提取）。

export const END_HASHES = {
  // 入口三步 · 假结局序列：theterraisours → debate → grisea（比较时统一转小写）
  fakeStep0: 'afd9c23e8a0a311ead4004f09c811512c62c1d418da8a0fe3bd60e647d1ff915',
  fakeStep1: '6f7a9000cccc11b5223760ed0b76329581848cd0604509730ca2be54e6d317d8',
  fakeStep2: '0e2e26dc44ec6a7f3ea46b4abbbce07358e74ff1048f74889db1c9eb022b04d7',
  // 入口三步 · 真结局序列：dlrowhcnyl → emhcnyl → aesirg（比较时统一转小写）
  trueStep0: 'f0c990b443f175b1e2ac00b6ec236166929b2e13d619cd7a7d5e0235c0d78530',
  trueStep1: '68c050d277c7339caa5af7b45e74a857f62e69b4393a538f5324d5eb91659018',
  trueStep2: 'e2c1853f0566e31c5e0f97250d909b2255efe1bd3158ece4b83962f960981158',
  // 回响页：真结局密钥（不区分大小写，比较时统一转小写）
  echoTrue: 'caea1c14ccef74e274be77315e662503672d64e6748f4ad071097a12fddabe9e',
  // 回响页：假结局密钥（严格匹配，区分大小写）
  echoFake: '29eab40198c6a7c5ef919c8eaf7f1c3b5692ef461ffb5a7d96eb0b3be8db1a7e',
} as const;

// 会话有效期（30 分钟无操作自动清理）
export const SESSION_TTL_MS = 30 * 60_000;
