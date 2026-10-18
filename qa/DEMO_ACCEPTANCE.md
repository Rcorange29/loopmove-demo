# Demo 验收记录 — 2026-10-18（香港时间）

范围：仅 loopmove-demo；未处理比赛材料。基线分支 genai-backend-integration，HEAD 963b2b8。本轮修改保留在本地，尚未提交或发布。

## 已验证

- Render `/api/health` 返回 ok，配置模型为 doubao-seed-2-1-lite-260915。
- 真实 POST `/api/arrange`：HTTP 200，3 个请求 ID 各出现一次，日期均在 1–2 范围内。请求 ID f11c9fe6e0f5。请求 Origin 为 https://rcorange29.github.io，响应允许该来源。
- 分天测试输入：2026-10-19、2026-10-20；qa-bed 被子、qa-desk 书桌、qa-pc 电脑。该测试证明结构合法和真实服务返回，不证明计划最优或满足所有生活需求。
- 真实 POST `/api/recognize`：HTTP 200，返回 6 个物品，provider/model/request_id 字段齐全。请求 ID c7cee6400b6b。输入为仓库自带 example-room.png，不是新拍摄的房间照片，也不算识别准确率评测。
- 无效图片：HTTP 400 / INVALID_IMAGE；请求 ID 7690c499cde9，没有返回伪造识别结果。
- 公开站点 journey.js 与修改前 HEAD 文件完全一致，SHA256 a22080a8b52b6b436d4b5071076a84192527b462effc12033e0726f979fa8b91。
- GitHub API 查询 PR #2：open，merged=false，mergeable=true（查询时状态）。
- 14 项 Node 逻辑回归测试通过；涵盖固定／不搬物品排除、重复／遗漏／未知 ID、非法日期、演示结果、失败重试、取消、过期结果、单日规则安排、手动改日期后的 TXT 同步。
- journey.js 与 HTML 内联脚本语法检查通过；git diff --check 通过。

## 本地修复

- 智能安排仅发送需要带走的物品，保留当地购买、转卖、捐赠、回收与固定设施选择。
- 严格校验返回 ID、数量、日期，不接受重复、遗漏、额外 ID 或显式 demo/error 结果。
- 失败不覆盖旧安排，提供重试、显式规则方案、返回；加载时可取消，忽略取消后或清单变化后的过期结果。
- 本地规则方案按估计体积分配，不再擅自将大件改为重买、装饰改为不搬。
- 去向建议与打包参考明确标注规则来源；同步 README，保留 AI 生成素材的真实说明。

## 未通过验收／剩余 P0

- Chrome 浏览器自动化不可用（无可用 browser surface；原生应用报 ScreenCaptureKit -3811）。因此本轮没有公开 UI 端到端操作或截图证据，不能声称其通过。
- 尚需用非示例真实照片在浏览器中完成识别、纠错、Smart start、手动改日期、选择去向、最终清单与下载。
- 尚需浏览器中验证三种语言、失败弹窗、取消、重试与加载状态的实际呈现。
- 本地修复尚未发布，公开站点仍为旧代码。按验收要求，未盲目合并 PR。
- 完成浏览器验收后，将修复提交到集成分支，部署该分支复测；通过后再合并。

## 重现

`node --test tests/arrangement.cjs`

公开 Demo：https://rcorange29.github.io/loopmove-demo/

PR：https://github.com/Rcorange29/loopmove-demo/pull/2

同目录 JSON 保存本轮实际服务响应，不含 API 密钥。它们是 API 层证据，不是 UI 截图。

## 本地预览连接修复

用户实测发现本地上传与安排均不可用。复现原因：Render 对 Origin `http://127.0.0.1:8000` 的 OPTIONS 预检返回 HTTP 403 / ORIGIN_NOT_ALLOWED。此前只验证公开站点来源，不能据此认定本地浏览器可用。

新增 `preview.py`，仅监听 127.0.0.1:8000，提供页面和固定 API 路由代理。本地 `/config.js` 返回同源 API 地址；公开发布的 config.js 不变。启动方式改为 `python3 preview.py`。需刷新已打开页面才能获取新配置。

修复后从本地同源地址测试：`/api/arrange` HTTP 200（request_id: 70ec68c34c30）；`/api/recognize` 使用仓库示例图 HTTP 200，返回 6 个物品（request_id: 5d59a1462713）。两次请求均带本地 Origin。浏览器 UI 尚待用户刷新验证。

## 识别框、语言与卡片修复（本地）

已删除缺少 bbox 时均匀铺框的逻辑；仅绘制有效坐标，并支持用户手动画框修正。请求携带界面语言和坐标格式，多语言名称、固定设施判断、编辑同步已接入。处置卡片加宽，按钮按内容宽度排列并在不足时换行。19 项逻辑测试通过，HTML 内联脚本与 JS 语法通过。

未完成：当前 Render 响应没有 bbox 和多语言 names；传参不代表后端已支持。精准模型定位和语言生成需后端更新，不能宣称已上线。私有仓库 fetch 返回 Repository not found。部署要求见 RECOGNITION_BACKEND_HANDOFF.md。视觉浏览器验收仍未完成。
