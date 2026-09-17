// 终局页 /ORACLESAIDTHATCIVILSWITHNOENDSANDNOBEGINS 的会话与限速后端已在仓库侧移除，
// 此模块仅保留管理面板“重置 /end 页面状态”入口的兼容签名，避免构建期缺少依赖。
// 新需求如需重置终局页状态，可在此接入对应内存会话/限速容器的清理逻辑。
export function resetEndSessions(): { sessions: number; locks: number } {
  return { sessions: 0, locks: 0 };
}
