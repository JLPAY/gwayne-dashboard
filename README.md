# Gwayne Dashboard

Kubernetes 可视化管理面板前端 —— 基于 [Qihoo360/wayne](https://github.com/Qihoo360/wayne) 的定制分支（JLPAY）。

覆盖集群资源的全生命周期管理：创建 / 编辑 / 删除 / 回滚 / 伸缩 / 日志 / Web 终端 / 模板化发布。
资源类型包含 Deployment、StatefulSet、DaemonSet、CronJob、ConfigMap、Secret、Ingress、PVC、
Autoscale、K8sGPT、审计日志、权限与用户管理等。

## 技术栈

以下版本为 `node_modules` 实测口径（不是 `package.json` 的声明范围）：

| 项 | 当前版本 |
|---|---|
| Angular | 12.2.17 |
| Angular CLI / build-angular | 12.2.18 / 12.2.18 |
| Clarity（`@clr/angular` / `@clr/ui`） | 12.4.4 |
| Clarity 图标（`@clr/icons`，版本线比主包短） | 12.0.12 |
| Design System（`@cds/core`，Clarity 5 起取代已停发的 `@clr/core`） | 5.8.4 |
| TypeScript | 4.3.5（编译 `target: es5`） |
| RxJS / zone.js / tslib | 6.6.7 / 0.11.8 / 2.8.1 |
| 打包 | webpack 5.50.0（精确钉 = build-angular 的 pin，勿写 `^`） |
| ngx-markdown | 9.1.1 |

> **迁移进行中**：正从 Angular 8 逐级升级到 Angular 21 + Clarity 18.4，当前停在 **2c（Angular 12 + Clarity 12）**，
> 该跳的改动已落地工作区、尚未提交（验收结论见 [docs/迁移进度.md](docs/迁移进度.md) 2c 一节）。
> 方案与每跳明细见 [docs/Angular-8到21-升级方案.md](docs/Angular-8到21-升级方案.md)、
> [docs/迁移进度.md](docs/迁移进度.md)。
> 迁移期间**对外接口契约与 UI 模板契约必须零漂移**，改完代码务必跑一遍[质量门禁](#质量门禁)。

## 环境要求

- **Node.js**：本机实测 `v22.22.2` + `npm 10.9.7` 可正常构建与启动；仓库 `.nvmrc` 声明 `16.20.0`。
- **npm 7+ 的 peer 校验**：仓库根 `.npmrc` 已设 `legacy-peer-deps=true`。
  这是**迁移期的临时措施**（`@angularclass/hmr`、`xterm` 3.x、`ngx-markdown` 9.x 等老包的 peer 声明
  无法与当前 Angular 同时满足），迁移收尾、废弃依赖清理完成后应移除该文件。
- **OpenSSL**：所有 npm 脚本已内置 `--openssl-legacy-provider`（Node 17+ 走 OpenSSL 3，
  webpack 4 依赖的 md4 摘要需要该开关），无需再手工设置环境变量。
  若在 Node 16 及以下报 `bad option: --openssl-legacy-provider`，把该参数从脚本里去掉即可。
- 平台：Windows / Linux / macOS 均可。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置后端地址（必做）

编辑 `src/config.js`。**该文件是本地环境配置，改动不应提交**：

```js
window.CONFIG = {
  URL: 'http://<后端地址>:<端口>',   // Wayne 后端 API 基址，前端所有请求以此为前缀
  RAVEN: false,                     // 是否启用 Sentry / Raven 错误上报
  RAVEN_DSN: 'RAVEN_DSN'            // 启用时填真实 DSN
};
```

- 该文件被 `index.html` 以 `<script src="config.js?v=1">` 引入，并在 `angular.json` 的 `assets`
  里声明，构建时原样拷到产物根目录。
- 开发环境不会初始化 Raven，但错误处理器仍按 `RAVEN` 取值选择实现，**建议开发环境也置 `false`**。
- **生产环境**若 `RAVEN: true` 而 `RAVEN_DSN` 仍是占位符，启动时会抛 `RavenConfigError` 导致**白屏**。
  生产部署务必置 `RAVEN: false` 或填真实 DSN。

### 3. 启动开发服务器

```bash
npm run start     # 等价于 ng serve --host 0.0.0.0 --disable-host-check --configuration hmr
```

访问 <http://localhost:4200>，默认跳转到 `admin/reportform/overview`。

## 构建

```bash
npm run build       # 开发构建 → dist/
npm run build:aot   # 生产构建（--prod --aot）→ dist/
```

- 单个组件样式设了 6kB 的告警预算（`angular.json` 的 `anyComponentStyle`）。
- 各跳的生产产物体积随 Clarity / Angular 版本变化，逐跳记录见
  [docs/迁移进度.md](docs/迁移进度.md)；v9（2-pre 时期）可比口径为
  main 1.44MB / vendor 3.03MB / styles 527kB。
- **dev 构建不一定产出独立的 `styles.css`**：**v11 起会产出**（v10 则把样式打进 `styles.js`）。
  实测 2b（v11）：styles 670.78kB / vendor 15.01MB / main 9.32MB；
  2c（v12）：styles 754.55kB / vendor 13.28MB / main 9.29MB / polyfills-es5 651.98kB。
  量测样式（例如展开行布局回归）时注意这点：v10 及以前必须取生产产物里的哈希名
  `styles.<hash>.css`（见「构建注意事项」2）。
- 当前 `target: es5`，因此生产构建会做 ES5 差分加载（见「构建注意事项」2）。

## npm 脚本

| 命令 | 说明 |
|---|---|
| `npm run start` | 启动 dev server（HMR，`0.0.0.0:4200`） |
| `npm run build` | 开发构建 |
| `npm run build:aot` | 生产构建 |
| `npm test` | 单元测试（Karma + Jasmine） |
| `npm run lint` | tslint 静态检查。**Angular 13 起**官方迁移会删掉 `angular.json` 的 lint target（`ng lint` 不可用），**最迟需在 2d（12→13）前定下 tslint → eslint 策略** |
| `npm run e2e` | 端到端测试（Protractor） |

## 目录结构

```
src/                        应用主源码树（会被编译）
├── app/
│   ├── admin/              管理端界面 —— 路由的实际入口
│   ├── portal/             普通用户端界面（历史遗留，当前未被任何路由引用）
│   ├── shared/             共享模块：HTTP 客户端、数据模型、通用组件、管道、拦截器
│   ├── app.module.ts       根模块（Raven / i18n / 全局 provider / bootstrap）
│   └── app-routing.module.ts
├── environments/           environment.ts / .prod.ts / .hmr.ts
├── config.js               运行时配置（后端地址 / Raven），不入库
├── styles.scss             全局样式（含 Clarity 主题覆盖与升级回归修复）
└── main.ts · polyfills.ts · index.html
lib/                        第二棵源码树（30 个 .ts，与 src/ 一起编译，扫描/改造勿遗漏）
├── shared/ · portal/ · admin/
docs/                       升级方案、迁移进度、重构方案与架构分析
tools/                      契约快照 / 门禁 / codemod / 运行时冒烟脚本
contract/                   契约快照产物（gitignore，不入库）
```

## 接口约定（改动前必读）

当前契约规模：**路由 151 条 / HTTP 调用点 331 个 / 唯一 URL 314 个 / 组件 selector 351 个**。

- 查询参数有**两种风格，不可互相合并**：
  - v1 业务 API（`/api/v1/apps/...`）：过滤用 `key__contains=value`；
    仅 `deleted` / `id`（及其 `__exact` 后缀）做精确匹配
  - k8s `_proxy`（`src/app/shared/client/v1/kubernetes/base-client.ts::buildParam`）：全部 `key=value`
- 分页固定 `pageNo` / `pageSize`；排序 `sortby`（倒序加 `-` 前缀）；
  过滤串 `filter=k=v,k2__contains=v2`。
- 参数拼装的统一入口为 `src/app/shared/client/v1/list-params.ts`，**新增代码请复用，不要再内联拼装**。
- 运行时配置来自 `window.CONFIG`（由 `src/config.js` 注入）；`typings.d.ts` 未声明它，
  故代码中统一写 `(window as any).CONFIG`。

## 质量门禁

改动接口或模板相关代码后，必须跑通三层门禁（**全绿才允许提交**）：

```bash
# 1. 接口契约：路由 / 端点 / selector
node tools/contract-snapshot.js contract/snapshot.json
node tools/check-contract.js contract/baseline.json contract/snapshot.json

# 2. UI 模板契约：元素名 / 属性名 / 管道 / @Input / @Output
node tools/template-snapshot.js contract/template-snapshot.json
node tools/check-template.js contract/template-baseline.json contract/template-snapshot.json

# 3. 参数拼装行为等价性（93240 用例）
node tools/verify-param-equivalence.js
```

运行时冒烟（需要 Playwright 自带 Chromium）：

```bash
npm start &                      # 先起 dev server
node tools/smoke-runtime.js      # 判据：渲染出应用 DOM 且无未捕获异常
```

> 后端不可达导致的 401 / 连接失败**不算**冒烟失败。
>
> **构建全绿 ≠ 能跑**：冒烟是三层静态门禁的补集，只验证 bootstrap + 无未捕获异常，
> 但它抓到过静态门禁完全看不见的问题。每跳都必须做。

`tools/` 脚本一览（完整用法见各脚本头注释）：

| 脚本 | 用途 |
|---|---|
| `contract-snapshot.js` | 抽取路由 / HTTP 端点 / selector 契约快照（可指定扫描根，用于对旧源码树生成基线） |
| `check-contract.js` | 接口契约 diff 门禁，差异即 `exit 1`，可直接接 CI |
| `template-snapshot.js` | 抽取 UI 模板契约快照（元素名 / 属性名 / 管道 / `@Input` / `@Output`） |
| `check-template.js` | UI 模板契约门禁，兜住 Clarity 改名类变更 |
| `verify-param-equivalence.js` | 参数拼装行为等价性夹具（机械提取旧实现 + 真实执行比对） |
| `analyze-list-patterns.js` | 参数拼装聚类分析（判断某类重复能否安全收敛的依据） |
| `codemod-list-params.js` | 参数拼装收敛 codemod |
| `codemod-remove-noop-catch.js` | 清理空转的 `.catch(e => throwError(e))` |
| `codemod-rxjs-compat.js` | 清除 `rxjs-compat` 深路径导入（类型检查驱动 + 多轮收敛 + 写盘前语法自检） |
| `diag-rxjs-operators.js` | 打印每个 `.map` / `.catch` 等调用点的**接收者类型**（批量改写前先拿真值） |
| `smoke-runtime.js` | 浏览器级运行时冒烟（Playwright 自带 Chromium + dev server） |
| `normalize-eol.js` | 行尾归一化（见「构建注意事项」6） |

**关于基线**：`contract/` 已被 `.gitignore` 排除，**基线快照不随仓库分发**。
门禁的语义是「与一份已知正确的基线逐项比对」，因此基线在本地维护：

- 需要新建基线时：`node tools/contract-snapshot.js contract/baseline.json`（以**当前**代码为基线）；
- 若基线丢失，门禁会以退出码 2 报「找不到快照文件」，而不是静默通过。

> 门禁脚本自身需要做过对照实验才可信：往基线注入已知漂移，确认能检出并 `exit 1`；
> 无差异时 `exit 0`。只会在无差异时打印「一致」的脚本不算门禁。

## 迁移状态

**一跳一提交、三层门禁全绿才提交**，当前进度：

| 阶段 | 内容 | 状态 |
|---|---|---|
| M0 | 重构固化基线提交（`b1f92bf`） | 已完成 |
| 1 | Angular 8→9 + Clarity 2→3（`c86e985`） | 已完成 |
| 1R | 跳 1 回归修复：表格边框复现 + 行内固定列底色断层（`3af4891`） | 已完成 |
| 2-pre | 清除 rxjs-compat 深路径导入（`ec82957`） | 已完成 |
| 2a | Angular 9→10 + Clarity 3→4（`e678120`） | 已完成 |
| 2aR | 2a 回归修复：展开行详情还原通栏顶左（`5f79753`） | 已完成 |
| 2b | Angular 10→11 + Clarity 4→5（`a85f260`） | 已完成 |
| 2c | Angular 11→12 + Clarity 5→12（复用历史产物 `f6dec50` 重新落地） | 已完成（工作区，未提交） |
| 2d | Angular 12→13 + Clarity 12→13 | 待做 |
| 3 | Angular 13→17 + Clarity 13→17 | 待做 |
| 4 | Angular 17→21 + Clarity 18.4（含 Angular 20 的 Clarity 空窗硬撑） | 待做 |
| 5 | zoneless 评估 + 废弃依赖清理 | 待做 |

每跳的依赖变化、官方迁移产物、手工修复项与踩坑记录，见 [docs/迁移进度.md](docs/迁移进度.md)。

## 构建注意事项（踩过坑）

1. **`npm install` 前先停掉 dev server**：webpack watcher 会占用 `node_modules/@clr/*` 下的文件，
   导致 npm 删除失败（报 `[safe-delete] ... trash operation ... aborted`）。
   查端口占用 `netstat -ano | findstr :4200`，杀进程 `taskkill /F /PID <pid>`。
2. **生产构建（`npm run build:aot`）必须在普通权限终端跑**：当前 `target: es5`，
   v10+ 的 ES5 差分加载会通过 babel-loader 写 `babel-webpack/*.json` 缓存，
   在受限权限/沙箱环境下被拦成 `EPERM: operation not permitted, open '...json'`
   （换 `NG_BUILD_CACHE` 到别处同样失败，是写入策略而非路径问题）。开发构建不受影响。
3. **`@angular/*` 的版本前缀一律写 `~` 不要写 `^`**：npm 上 `@angular/core` 常比 `@angular/cli`
   多出一个小版本（如 core 有 14.3.0 而 cli 没有），写 `^` 会造成 core / cli 错配，
   出现「根目录一份 + 嵌套一份」的双实例安装。
4. **本机 `ng update` 不可用**：它要装「临时 CLI」，走到 `spawnSync cmd.exe` 就稳定报 `EBUSY`
   （脱沙箱重试同样失败，非偶发）。等效流程：**手工改 `package.json` 版本 + `npm install`**，
   再用已装好的新 CLI 跑
   `ng update <pkg>@N --migrate-only --from=<N-1> --to=N --allow-dirty`
   （注意 v10 CLI 的开关是 `--migrate-only`，写成 `--migrations-only` 会被当成包名报错）。
5. **`npm ci` 可能长时间无输出**：实测曾挂在 `idealTree buildDeps` 阶段不再前进，改用 `npm install`。
   另注意 npm 的汇总行（`changed N packages`）与实际结果并不总是相符，
   **版本判定请以 `node -p "require('./node_modules/<pkg>/package.json').version"` 实测为准**。
6. **行尾统一 CRLF**：仓库无 `.gitattributes`（`core.autocrlf=true`）。
   用脚本批量改文件后，先用 `git diff --name-only` 导出清单，
   再执行 `node tools/normalize-eol.js <清单文件>` 归一，
   否则 diff 会被行尾噪声淹没，真正的内容改动反而看不见。
7. **浏览器自动化用 Playwright 自带的 Chromium**：本机 Edge 被安全策略静默拦截
   （`--headless` / `--dump-dom` / `--screenshot` 全部无输出，连 `--version` 都是空的）。
   冒烟脚本按 `NODE_PATH=<playwright workspace>/node_modules node tools/smoke-runtime.js` 的方式运行。

## 常见问题

### `error:0308010C:digital envelope routines::unsupported`

Node 17+ 的 OpenSSL 3 与旧 webpack 不兼容。本仓库所有 npm 脚本已内置 `--openssl-legacy-provider`，
直接用 `npm run ...` 即可；若手工调用 `ng`，请自行加上该参数，或 `nvm use 16.20.0`。

### 构建时 JavaScript heap out of memory

适度提高堆上限：

```bash
node --openssl-legacy-provider --max_old_space_size=8000 ./node_modules/@angular/cli/bin/ng build
```

### 生产部署后页面白屏

优先检查部署产物中的 `config.js`：`RAVEN_DSN` 是否仍是占位符（见「快速开始 · 2」）。

### 改了代码但门禁说接口变了

先确认改动是否**故意**变更对外接口。若只是重构，说明契约被破坏，需要回退；
若确为有意变更，才更新 `contract/baseline.json`（并说明原因）。

## 许可

MIT，见 [LICENSE](LICENSE)。
