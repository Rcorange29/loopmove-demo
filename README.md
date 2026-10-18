# LoopMove

面向香港北部搬迁场景的物品整理与循环利用 Demo。通过拖拽物品安排搬家日期，把不带走的物品分为当地购买、转卖、捐赠或回收，并在地图上查找相关地点。

本仓库是**静态前端**：HTML + CSS + JavaScript，无需 Node.js、npm 安装或构建。当前集成分支为 `genai-backend-integration`。

## 快速启动

### 已有项目

在包含 `index.html`、`journey.js` 和 `journey.css` 的 `loopmove-demo` 目录中打开终端：

```bash
python3 preview.py
```

本地预览请使用 `preview.py`：它将 AI 请求同源转发到现有 Render 服务，不需要模型密钥。普通 `python -m http.server` 不能代理 AI 请求，远程服务会拒绝本地浏览器来源。公开部署仍使用仓库的 `config.js`。

浏览器打开 **http://127.0.0.1:8000**，保持终端运行。停止服务按 `Ctrl + C`。

Windows 安装 Python 后可使用：

```powershell
py preview.py
```

### 从 GitHub 下载

需要 Git 和 Python 3：

```bash
git clone https://github.com/Rcorange29/loopmove-demo.git
cd loopmove-demo
python3 preview.py
```

同样打开 **http://127.0.0.1:8000**。建议通过 HTTP 启动，不要直接双击 HTML 文件。

## 体验流程

1. **设置搬家信息**：选择片区和入住日期。
2. **整理房间物品**：使用示例房间或手动添加，点击卡片编辑；固定设施留在原处。
3. **对比搬运方案**：智能安排请求远程 AI 为需要带走的物品分配日期，保留已选的不带走／当地购买去向；也可手动拖动。点击物品，在地图旁对比搬运体积和重购参考价，查看附近商店及回收点。
4. **安排物品去向**：选择转卖、捐赠或回收；“一键规则建议（非 AI）”仅补充未选择项，保留已有决定。
5. **搬家行动清单**：四步结束后查看按日期、购买、处理及固定设施分组的清单，保留待完善事项，下载 TXT 或打印为 PDF。

保留简体中文、繁体中文、English，以及标准、老年和视障模式。重购价格为演示参考，去向和打包建议由本地规则生成，物品成色、库存和接收条件需自行确认。

## GitHub Pages live demo

此目录本身是独立 Git 仓库，对应 `Rcorange29/loopmove-demo`。已提供 `.github/workflows/pages.yml`，仅发布 HTML、CSS、JS 和 assets。

1. 将本目录修改提交并推送至该仓库的 `main` 分支。
2. 在 GitHub 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。
3. 运行 **Deploy LoopMove demo** 工作流（或再次推送），成功后以 Actions 输出的地址为准；默认地址为 `https://Rcorange29.github.io/loopmove-demo/`。

本地修改不代表已上线。纯静态演示无 API 密钥、无需构建；地图底图及回收点查询仍需网络。

## 静态演示与 AI 的区别

| 功能 | 使用上述启动命令时 |
| --- | --- |
| 示例房间、文字录入、物品编辑 | 可用 |
| 拖拽日期、购买／处理分组、TXT 下载 | 可用 |
| 智能安排 | 请求配置的 `/api/arrange`；失败时保留原安排，可重试或主动选择“规则安排（非 AI）” |
| 照片 AI 识别 | 请求配置的 `/api/recognize`，依赖远程后端可用性；识别结果可手动修正 |
| 语音输入 | 依赖浏览器支持和麦克风权限 |
| 地图与回收点查询 | 需要网络；详情见下方 |
| 装箱建议 | 基于现有物品和估算尺寸生成，不是实时模型建议 |

**本仓库不包含 AI 后端。** `config.js` 中的 `window.LOOPMOVE_API_BASE` 当前指向 Render 服务。前端据此启用 API 请求；配置存在不等于线上推理或浏览器验收成功。密钥仅保留在后端。

远程后端需提供以下接口并允许前端来源的 CORS 请求：

| 接口 | 请求 | 响应 |
| --- | --- | --- |
| `POST /api/arrange` | `{ "dates": ["2027-09-01", "2027-09-02"], "items": [{ "id": "it1", "name": "被子", "kind": "床品" }] }` | `{ "items": [{ "id": "it1", "day": 1 }] }` |
| `POST /api/recognize` | `{ "image": "data:image/jpeg;base64,..." }` | `{ "items": [{ "name": "椅子", "size": "50×50×90cm", "vol": 0.04, "kind": "大件家具", "fixed": false }] }` |

安排结果必须恰好包含请求物品的全部原始 `id`，不允许重复或额外 ID；`day` 是从 1 开始的日期序号，不能超过日期数量。固定设施、当地购买和不带走物品不发送给安排接口。失败、超时或无效结果不会覆盖原安排；用户可重试、返回或主动选择本地规则方案。规则方案按估算体积分配日期，不会替用户决定丢弃或重购物品。

## 地图与数据说明

- 当前界面使用仓库内的 **Leaflet**，底图加载 OpenStreetMap，失败时尝试 Esri 底图；无需额外配置地图 key。
- 购买地点来自内置演示数据，类别匹配不代表商店实际有货。
- 回收点通过 **OpenStreetMap Overpass API** 动态查询；点位不代表所有物品均可接收。请求失败或附近没有数据时，可使用页面提供的官方回收地图入口。
- 捐赠、转卖及回收链接是外部服务入口，页面不会代为预约或发布物品。
- 箱包数量和规格仅为估算，装箱前应核对实际内尺寸和承重。写实箱包图片是 AI 生成参考图，不对应具体商品；提示词见 [素材记录](assets/images/packing-reference.md)。
- 物品和时间线保存在当前页面内存中，**刷新页面会重置安排**；语言偏好保存在浏览器 `localStorage` 中。离开前请先导出 TXT。

## 文件结构

```text
loopmove-demo/
├── README.md
├── index.html                 # 页面结构、基础样式、演示数据和原有逻辑
├── journey.js                 # 当前时间线、处理、地图、装箱与导出交互
├── journey.css                # 当前界面的统一网格、间距和响应式样式
└── assets/
    ├── images/
    │   ├── example-room.png
    │   ├── packing-reference.png
    │   └── packing-reference.md
    └── leaflet/               # 本地地图库与图标
```

`journey.js` 在页面基础脚本之后加载，覆盖部分旧函数；当前布局以 `journey.css` 为准。修改或部署时需要保留这两个文件和 `assets/`，不能只复制 `index.html`。

## 常见问题

- **提示找不到 python3**：先安装 Python 3；Windows 尝试使用 `py`。
- **8000 端口被占用**：先停止旧预览服务，再运行 `python3 preview.py`。
- **打开后显示目录列表**：终端启动位置不对，请进入本仓库根目录再运行。
- **修改后页面没有变化**：强制刷新（macOS：`Cmd + Shift + R`；Windows：`Ctrl + Shift + R`）。刷新前先导出需要保留的安排。
- **地图空白或回收点不显示**：确认网络可访问底图及 Overpass 服务；仍失败时使用地图区域的外部查询链接。
- **照片识别不可用**：检查 `config.js` 配置、后端状态与网络；可使用明确标注的示例房间或手动录入继续。

## 智能安排回归验证

运行 `node --test tests/arrangement.cjs`。覆盖正常返回、重复／遗漏／未知 ID、非法日期、规则模式、失败、取消、请求期间清单变化和单日安排。这些是逻辑测试，不能代替公开浏览器端到端验收。

## Planning modes

`Plan myself` clears all date assignments, item destinations and AI draft notes, retaining the inventory, photos, fixture classification and selected dates. No AI planning requests run in this mode. Packing guidance is hidden.

`Smart start` uses AI date assignment. The editable plan appears below Leave behind, next to the map. Moving cards remain authoritative; editing the draft changes notes only. Undecided leave-behind items can receive AI resale/donation/recycling suggestions, which can be changed individually. Existing decisions are preserved. Notes are included in the final checklist and TXT export. The last navigation item is Moving checklist.

The new plan/disposal APIs require deploying `ai_service.py` from **this** repository to the existing Render service. Local UI changes do not deploy the backend. See DEPLOY_AI.md. Until then, the existing recognition/arrangement endpoints remain available; new features show an unavailable message rather than fabricated AI output.

Tests: `node --test tests/*.cjs` and `python3 -m unittest discover -s tests -p 'test_*.py'`. Full DOM integration test (mocked AI, not live inference): install jsdom outside the repository, then run `NODE_PATH=/tmp/loopmove-dom-qa/node_modules node tests/dom-flow.js`. It checks manual reset/no AI calls, Smart start, draft editing, disposal choices, final checklist and TXT, and resetting again.
