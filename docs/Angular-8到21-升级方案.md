# Gwayne Dashboard 大版本迁移方案

**Angular 8 → 21，Clarity 2 → 18.4，原地逐级升级**

> 生成日期：2026-10-09
> 决策：路线 = 原地逐级升级（不重写）；目标 = Angular 21 + Clarity 18.4
> 依据：全部数字为本次实测（源码扫描 + npm 官方 registry 查询），非估算

---

## 0. 结论摘要

| 项 | 结论 |
|---|---|
| 路线 | 原地逐级升级，保留全部业务逻辑、路由与模板结构 |
| 目标 | **Angular 21 + Clarity 18.4** |
| 跳数 | **13 跳**（8→9→…→21），每跳独立可发布 |
| 唯一硬风险 | **Angular 20 是 Clarity 空窗期**（详见 §5） |
| 先决条件 | 三层门禁必须先建好并跑绿（详见 §6） |
| 明确不做 | 不用 React/Vue 重写；不跳过中间版本 |

---

## 1. 现状盘点（实测）

### 1.1 技术栈

| 组件 | 当前 | 目标 | 差距 |
|---|---|---|---|
| Angular | 8.1（2019-05） | 21 | 落后 **13 个主版本**；v8 已 EOL |
| Clarity | 2.0.3 | 18.4.0 | 落后 9 代 |
| TypeScript | 3.4.5 | 5.x | 落后 2 个大版本 |
| 构建 | webpack 4 + `@angular-devkit/build-angular` 0.801 | webpack 5 + esbuild/vite | 全链路更换 |
| 测试 | karma 4 + jasmine 2.99 + protractor 6 | Vitest（Angular 21 默认） | protractor 已废弃 |
| Lint | tslint 5（已废弃） | eslint | Angular 11 起官方弃用 tslint |

### 1.2 规模

| 指标 | 数值 |
|---|---|
| 文件数（src + lib） | 1323（.ts 736 / .html 352 / .scss 220） |
| 代码行数 | 91,558 |
| 组件 `@Component` | 351 |
| 服务 `@Injectable` | 87 |
| 模块 `@NgModule` | 111 |
| 指令 `@Directive` | 1 |

### 1.3 迁移工作面（决定工作量的实测计数）

| 工作面 | 计数 | 首次受阻于 | 说明 |
|---|---:|---|---|
| 模板中 `clr-*` 出现次数 | **7054** | 每一跳 | 最贵的一块；Clarity 每代都有类名重命名与组件 API 变更 |
| 不同的 Clarity 组件标签 | **36** | 每一跳 | `clr-datagrid` / `clr-dg-*`（9 个）/ `clr-icon` / `clr-vertical-nav` 等 |
| 引用 `@clr/angular` 的文件 | **127** | 每一跳 | 需要逐个替换模块导入 |
| `@ViewChild/@ContentChild` 等 | **355** | **Angular 9** | v9 强制要求 `{static: true/false}`，必须逐个判定 |
| `rxjs-compat` 深路径导入 | **264** | **Angular 10** | `rxjs/add/operator/xxx` 形式，v10 起必须清除 |
| `ngModel` 绑定 | **516** | **Angular 14** | 类型化表单会逐处报错 |
| 结构指令 `*ngIf/*ngFor/*ngSwitch` | **961** | 不强制 | Angular 17 新控制流 `@if/@for` 为可选迁移 |
| 模板使用的不同属性名 | **243** | 每一跳 | 含 `*clrDgItems` / `[(clrDgPage)]` 等 Clarity 指令 |
| 组件 `@Input` / `@Output` | 95 / 38 | 每一跳 | 组件对外 API，Clarity 升级可能连带改 |

### 1.4 好消息（已无需处理）

以下历史包袱**已经不存在**，不用花时间：

- `@angular/http`（旧 HttpModule）：**0 处**
- 已废弃的 `Renderer`：**0 处**
- `entryComponents`：**0 处**
- `ComponentFactoryResolver` 动态建组件：**0 处**

---

## 2. 为什么是原地升级，而不是重写

**核心论据：这个仓库现在有一件稀缺资产——可执行的兼容性判据。**

- `tools/contract-snapshot.js` 能静态抽取全部对外接口（151 路由 / 331 HTTP 调用点 / 314 唯一 URL / 351 selector）；
- `tools/check-contract.js` 把它变成 CI 门禁（diff 为空才算过）；
- `tools/verify-param-equivalence.js` 用 93,240 个用例证明参数拼装行为逐字节等价；
- 本次新增的模板契约门禁（§6.2）把 UI 结构也纳入同一套判据。

**这套东西在重写路线下会全部作废**：换成 React/Vue 后，351 个组件（datagrid、Pod 终端、复杂 CRUD 表单）的回归只能靠肉眼，91k 行业务逻辑的等价性无法证明。

对比两种路线的风险结构：

| | 原地升级 | 重写 |
|---|---|---|
| 业务逻辑 | 保留，零重写 | 91k 行全量重写 |
| 兼容性判据 | 已有，且逐跳复用 | 失效，需重建 |
| 失败形态 | 单跳失败 → 回滚单跳 | 长期双轨，交付日未知 |
| 可发布节奏 | 每跳可发布 | 只有终点 |
| 主要风险 | Clarity API 变更（可控、可定位） | 需求理解偏差 + 隐性回归（不可控） |

---

## 3. 升级阶梯与 Clarity 对应矩阵（实测 npm peer 依赖）

下表的 Clarity 支持区间来自 `npm view @clr/angular@<版本> peerDependencies`，是权威值。

| 跳 | Angular | Clarity | Clarity 声明的 Angular 支持区间 | 备注 |
|---:|---|---|---|---|
| 起点 | 8 | 2.4.11 | `^8.0.0-rc.1` | 当前 |
| 1 | 9 | 3.1.15 | `^9.0.0` | Ivy 默认；ViewChild static |
| 2 | 10 | 4.0.16 | `^10.0.0` | 必须清空 rxjs-compat |
| 3 | 11 | 5.5.3 | `^11.0.0` | 引入 `@cds/core`；tslint 弃用 |
| 4 | 12 | 12.4.4 | `^12.0.0` | |
| 5 | 13 | 13.18.3 | `13 \|\| 14 \|\| 15` | **ViewEngine 彻底移除**（Ivy only） |
| 6 | 14 | 13.18.3 | 同上 | 类型化表单；standalone 出现 |
| 7 | 15 | 15.14.8 | `15 \|\| 16` | 引入 `@angular/cdk` 对等依赖 |
| 8 | 16 | 16.6.0 | `15 \|\| 16 \|\| 17` | |
| 9 | 17 | 17.13.0 | `15 \|\| 16 \|\| 17 \|\| 18 \|\| 19` | 新控制流（可选） |
| 10 | 18 | 17.13.0 | 同上 | |
| 11 | 19 | 17.13.0 | 同上 | |
| 12 | **20** | **17.13.0（强制）** | ⚠️ **不含 20** | **空窗期**，见 §5 |
| 13 | 21 | 18.4.0 | `^21.1.0 \|\| 22` | 默认不带 zone.js |

**注意**：Clarity 的版本号在 v5 之后跳到了与 Angular 贴近的编号（12/13/15/16/17/18），但不是一一对应。不要按版本号猜支持区间，一律以 peer 依赖为准。

---

## 4. 逐跳工作面

### 4.1 Angular 侧的结构性变更（按跳）

这些是**一定会遇到**的，不是可能性：

- **8 → 9**：`@ViewChild/@ContentChild` 必须补 `{static: ...}`（355 处）；Ivy 成为默认渲染器，模板类型检查显著收紧；`entryComponents` 失效（本项目为 0，无影响）。
- **9 → 10**：清除全部 rxjs-compat 深路径导入（264 处）。
- **10 → 11**：tslint → eslint；`@angular/forms` 的 `minLength/maxLength` 校验行为变更。
- **12 → 13**：ViewEngine 被删除，只能 Ivy；大量长期弃用的 API 在此跳正式移除。
- **13 → 14**：类型化表单（516 处 `ngModel` 受影响）；standalone 组件引入。
- **14 → 15**：`ngcc` 移除，**所有第三方库必须已是 Ivy 兼容**。本项目需逐个评估：`ace`/`brace`、`xterm@3.11`、`echarts@4`、`particlesjs`、`raven-js`、`ngx-markdown@8`、`ngx-translate@11`。
- **17 → 18 / 18 → 19**：`HttpClient` 的 `provideHttpClient` 提供者模式；`zone.js` 变为可选。
- **20 → 21**：**默认不再包含 zone.js**。现有代码大量依赖 zone 驱动的变更检测，这是运行时行为变更，不是编译期错误（详见 §9 风险 R4）。

### 4.2 Clarity 侧的工作面

- 7054 处 `clr-*` 需要逐跳核对（类名重命名是 Clarity 的常规操作）。
- `@clr/icons` 在新版被 `@cds/core` 图标取代，`clr-icon` 元素需评估迁移。
- `clr-datagrid` 及其 9 个子组件（`clr-dg-*`）是本项目最重的 Clarity 依赖，需重点回归。
- 127 个文件手动 import `ClarityModule`，新版建议改用 standalone 导入或更细粒度的模块。

### 4.3 每跳的实际作业流程

```bash
# 1. 确认工作区干净（每跳必须从干净提交出发）
git status --porcelain

# 2. 升级 Angular（一次一个主版本）
npx ng update @angular/core@<N> @angular/cli@<N>

# 3. 升级 Clarity 到对应版本（见 §3 矩阵）
npm install @clr/angular@<版本> @clr/ui@<版本> --legacy-peer-deps

# 4. 修编译错误（tsc 会逐条报）
node --openssl-legacy-provider --max_old_space_size=8000 ./node_modules/@angular/cli/bin/ng build

# 5. 跑三层门禁（见 §6）——不通过不提交
node tools/contract-snapshot.js contract/snapshot.json
node tools/check-contract.js
node tools/template-snapshot.js contract/template-snapshot.json
node tools/check-template.js
node tools/verify-param-equivalence.js

# 6. 提交（一跳一提交，便于单独回滚）
git commit -m "chore(migration): Angular <N-1> -> <N>, Clarity <X> -> <Y>"
```

---

## 5. Clarity 空窗期（Angular 20）的处理

**问题**：`@clr/angular@17.13.0` 声明支持 `15 || 16 || 17 || 18 || 19`，`@clr/angular@18.4.0` 要求 `^21.1.0 || 22`。**Angular 20 落在两者之间，没有任何 Clarity 版本声明支持它。**

**可选方案：**

| 方案 | 做法 | 评价 |
|---|---|---|
| **A（推荐）** | Angular 20 这一跳继续用 Clarity 17.13.0，加 `--legacy-peer-deps` 绕过 peer 校验；到 Angular 21 再换 Clarity 18.4.0 | 只影响 1 跳；Clarity 17 与 20 只差 1 个主版本，运行时大概率可用；风险集中且可观测 |
| B | 跳过 Angular 20，直接从 19 升 21 | **不推荐**：`ng update` 只支持单主版本跳，跳过会丢失 20 的迁移 schematic |
| C | 在 Angular 20 上先降到 `@clr/ui` 纯 CSS（不使用 Clarity 组件） | 不现实：36 个 Clarity 组件标签深度使用中 |

**采纳方案 A。** 该跳的门禁要求与其他跳一致，另外增加一项人工检查：逐个走查 36 个 Clarity 组件标签涉及的主要页面（列表页、详情页、弹窗、侧边导航、Pod 终端）。

---

## 6. 安全网：三层门禁

迁移每一跳都必须跑完这三层，**全绿才允许提交**。

### 6.1 第一层：对外接口契约（已有）

```bash
node tools/contract-snapshot.js contract/snapshot.json
node tools/check-contract.js
```

覆盖：151 路由 / 331 HTTP 调用点 / 314 唯一 URL / 351 selector / 全部查询参数键集合。
当前状态：**完全兼容 ✓**

### 6.2 第二层：UI 模板契约（本次新增）

```bash
node tools/template-snapshot.js contract/template-snapshot.json
node tools/check-template.js
```

覆盖：351 个组件的模板结构 —— 226 个元素名 / 243 个属性名 / 10 个管道 / 95 个 `@Input` / 38 个 `@Output`。
作用：**Clarity 类名重命名、组件改名、指令 API 变更都会在这里暴露**，而这些不会体现在路由或 HTTP 上。
当前基线：`contract/template-baseline.json`（已在本次生成并验证）。
自检：已做对照实验——注入 `clr-icon→cds-icon`、`[class.clr-error]→[class.clr-invalid]`、删除一个 `@Input`，门禁全部检出并 `exit 1`；无差异时 `exit 0`。

### 6.3 第三层：行为等价性 + 构建（已有）

```bash
node tools/verify-param-equivalence.js
node --openssl-legacy-provider --max_old_space_size=8000 ./node_modules/@angular/cli/bin/ng build
```

94k 量级的参数拼装用例，逐字节比对 `HttpParams.toString()`；构建必须有产物且无 ERROR。

### 6.4 建议补充：路由冒烟（待建）

三层都是**静态**判据。Angular 20→21 的 zoneless 是**运行时**行为变更，静态门禁抓不到。建议补齐一个最小冒烟：起应用 → 逐个访问 151 条路由 → 断言无控制台 error、无白屏。这一步是 §9 风险 R4 的唯一有效防线。

---

## 7. 每跳的完成定义（DoD）

一跳算完成，必须同时满足：

1. `check-contract.js` → 「对外接口契约完全兼容 ✓」
2. `check-template.js` → 「UI 模板契约完全兼容 ✓」
3. `verify-param-equivalence.js` → 0 处不一致
4. `ng build` → 产物生成、无 ERROR
5. dev server 能起、首页能加载
6. 该跳的 breaking change 清单逐条勾完（无遗留 TODO）
7. 独立提交，commit message 标注跳数与 Clarity 版本

**任何一项不过，就地回滚该跳，不进下一跳。**

---

## 8. 回滚策略

- **一跳一提交**，回滚粒度 = 一个 `git revert`。
- 每跳开始前记录 `package-lock.json` 的 hash，回滚时一并还原（依赖树漂移是升级事故的常见根源）。
- 若某跳在合理时间内无法收敛，**允许原地停留**：停在一个受支持的版本上等待（例如卡在 Angular 17 时，Clarity 17 支持到 19，仍有退路）。
- 禁止在同一个提交里混入功能改动——否则回滚会连带丢功能。

---

## 9. 风险清单

| 编号 | 风险 | 影响 | 缓解 |
|---|---|---|---|
| R1 | Clarity 类名/组件重命名导致 UI 走形 | 高（7054 处） | 模板契约门禁逐跳比对；按 36 个组件标签分批走查 |
| R2 | 第三方库在 Angular 15（ngcc 移除）后不再兼容 | 高 | 提前评估 `xterm@3.11` / `echarts@4` / `particlesjs` / `raven-js` / `ace`，必要时替换或升级 |
| R3 | Angular 20 的 Clarity 空窗 | 中 | §5 方案 A；该跳增加人工走查 |
| R4 | Angular 21 默认不带 zone.js → 变更检测失效 | **高（运行时）** | 静态门禁抓不到，必须建路由冒烟；也可先在 18/19 上显式保留 zone.js 观察 |
| R5 | 类型化表单（Angular 14）大面积报错 | 中（516 处 `ngModel`） | 逐跳小步修，不做大爆炸式改造 |
| R6 | 依赖树在多次安装中漂移 | 中 | 每跳记录 lockfile hash；用 `--legacy-peer-deps` 时明确记录原因 |
| R7 | 13 跳周期长，中途主干与其他需求冲突 | 中 | 短分支 + 每跳合并；每跳都可发布，不攒大合并 |

---

## 10. 建议里程碑

| 阶段 | 内容 | 出口条件 |
|---|---|---|
| **M0 安全网** | 三层门禁建齐并跑绿；固化迁移基线提交 | 门禁自检通过（含对照实验） |
| **M1 低垂果实** | 跳 1–2（Angular 9、10）+ Clarity 3、4 | 清空 355 处 ViewChild、264 处 rxjs-compat |
| **M2 中段** | 跳 3–8（Angular 11–16）+ Clarity 5–16 | ViewEngine 移除、ngcc 移除、第三方库全部 Ivy 兼容 |
| **M3 冲刺** | 跳 9–13（Angular 17–21）+ Clarity 17 → 18.4 | 跨越 Angular 20 空窗；切到 Clarity 18.4 |
| **M4 收尾** | zoneless 评估、依赖清理、门禁接 CI | 路由冒烟全绿 |

**M0 是硬前置**：没有门禁就开始跳，等于把一个 91k 行的项目交给运气。
