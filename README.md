# Gwayne Dashboard

Kubernetes 可视化管理面板前端 —— 基于 [Qihoo360/wayne](https://github.com/Qihoo360/wayne) 的定制分支（JLPAY）。

覆盖集群资源的全生命周期管理：创建 / 编辑 / 删除 / 回滚 / 伸缩 / 日志 / Web 终端 / 模板化发布。
资源类型包含 Deployment、StatefulSet、DaemonSet、CronJob、ConfigMap、Secret、Ingress、PVC、
Autoscale、审计日志、权限与用户管理等。

## 技术栈

以下版本为 `node_modules` 实测口径（不是 `package.json` 的声明范围）：

| 项 | 当前版本 |
|---|---|
| Angular | 17.3.12 |
| Angular CLI / build-angular | 17.3.17 / 17.3.17 |
| Clarity（`@clr/angular` / `@clr/ui`） | 16.6.0（peer 覆盖 Angular 15–17，17 无需换） |
| Clarity 图标（`@clr/icons`，版本线比主包短） | 13.0.2（npm 上无 16.x，不动） |
| Design System（`@cds/core`，Clarity 5 起取代已停发的 `@clr/core`） | 6.17.0 |
| Angular CDK（Clarity 15 起 datagrid 的必需 peer，**版本线比 core 短**） | 17.3.10 |
| TypeScript | 5.2.2（编译 `target: ES2022`） |
| RxJS / zone.js / tslib | 6.6.7 / 0.14.10 / 2.8.1 |
| 打包 | webpack 5.94.0（精确钉 = build-angular 的 pin，v16 起为 5.94.0，勿写 `^`） |
| ngx-markdown | 16.0.0（v16 移除 ngcc，改用纯 Ivy 版） |

> **迁移进行中**：正从 Angular 8 逐级升级到 Angular 21 + Clarity 18.4，当前停在 **3d（Angular 17 + Clarity 16.6.0）**；
> 2c + 2d 提交为 `3ae53ec`、3a 为 `2363b0d`、3b 为 `6cbf918`、3c 为 `5ff451a`、
> 3cR（视觉回归修复）为 `8c203b4`、3d 为 `a3a3405`；
> 其中 3cR 及以前已推送远程（`ee40ae7..94816b7`），3d 为本地提交待推送；
> 验收结论见 [docs/迁移进度.md](docs/迁移进度.md) 2d / 3a / 3b / 3c / 3cR / 3d 各节。
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
- 生产构建参考产物体积（**3d / Angular 17 / `target: ES2022`**）：

  | 产物 | 大小 |
  |---|---|
  | `main.js` | ≈ 1.42 MB |
  | `vendor.js` | ≈ 3.19 MB |
  | `scripts.js` | ≈ 730.90 kB |
  | `styles.css` | ≈ 611.64 kB |
  | `polyfills.js` | ≈ 46.74 kB |
  | `runtime.js` | ≈ 1.20 kB |
  | **Initial Total** | **≈ 5.97 MB** |

  `target` 自 v15 起为 `ES2022`（Angular 15 官方 CLI 迁移的默认，并附 `useDefineForClassFields: false`
  以保持与 v14 一致的类字段语义）；产物**不含 ES5 降级代码**（ES5/IE11 已不受支持，
  `browserslist` 的 IE 行本就已注释）。产物中不含未被路由引用的 `portal/*` 组件树
  —— 那是历史遗留死代码，会被正常 tree-shake 掉，属预期行为。
  `styles.css` 由 v15 的 ≈480 kB 涨到 ≈612 kB，是 Clarity 从 13 跨到 16
  （**Clarity 没有 v14**，实为 13→15→16）三代的样式累积，属预期。
- **dev 构建不一定产出独立的 `styles.css`**：**v11 起会产出**（v10 则把样式打进 `styles.js`）。
  实测 2b（v11）：styles 670.78kB / vendor 15.01MB / main 9.32MB；
  2c（v12）：styles 754.55kB / vendor 13.28MB / main 9.29MB / polyfills-es5 651.98kB；
  2d（v13）：styles 617.47kB / vendor 12.95MB / main 9.57MB / scripts 847.14kB；
  3a（v14）：styles 643.20kB / vendor 12.22MB / main 8.49MB（Initial 22.33MB）；
  3b（v15）：styles 638.84kB / vendor 12.12MB / main 8.40MB（Initial 22.13MB）；
  3c（v16）：styles 946.12kB / vendor 12.95MB / main 8.39MB（Initial 23.18MB）；
  **3d（v17）：styles 946.57kB / vendor 13.22MB / main 8.58MB / scripts 770.76kB / polyfills 166.43kB**。
  量测样式（例如展开行布局回归）时注意这点：v10 及以前必须取生产产物里的哈希名
  `styles.<hash>.css`（见「构建注意事项」）。
- **v13 起移除差分加载**：不再产出 `polyfills-es5.*`，生产构建也不再走 babel
  （「构建注意事项」里那条沙箱 EPERM 问题随之消失）；**`target` 自 v15 起为 `ES2022`**。
- **依赖中不应出现 `__ivy_ngcc__/` 目录**（那是 View Engine 库靠 ngcc 续命的痕迹）。
  v16 移除 ngcc，此类库会在运行时白屏。自检：
  `ls -d node_modules/*/__ivy_ngcc__ node_modules/@*/*/__ivy_ngcc__ 2>/dev/null`（须无输出）。

## npm 脚本

| 命令 | 说明 |
|---|---|
| `npm run start` | 启动 dev server（HMR，`0.0.0.0:4200`） |
| `npm run build` | 开发构建 |
| `npm run build:aot` | 生产构建 |
| `npm test` | 单元测试（Karma + Jasmine） |
| `npm run lint` | tslint 静态检查（v13 移除了 `ng lint` 的 tslint builder，改为 `tslint -p src/tsconfig.app.json -c tslint.json` 直跑）。⚠️ **TS ≥4.8 起 tslint 已失效**——少报错误、漏查文件（受控实验：TS 4.6.4 为 84 错/36 文件，TS 4.8.4 与 4.9.5 均为 65 错/17 文件），输出仅供参考；**eslint 迁移已列为必做** |
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
node tools/check-clr-tokens.js   # Clarity CSS 变量的「计算值」断言（防样式覆盖静默失效）
```

> 后端不可达导致的 401 / 连接失败**不算**冒烟失败。
>
> **构建全绿 ≠ 能跑**：冒烟是三层静态门禁的补集，只验证 bootstrap + 无未捕获异常，
> 但已经抓到过两次静态门禁完全看不见的问题（2c 的生产产物组件定义缺失、3c 的 ngcc 移除导致白屏）。
> 每跳都必须做，dev 与生产产物各一次。

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
| 2c | Angular 11→12 + Clarity 5→12（复用历史产物 `f6dec50` 重新落地） | 已完成（`3ae53ec`） |
| 2d | Angular 12→13 + Clarity 12→13（复用历史产物 `64f394c` 重新落地） | 已完成（`3ae53ec`） |
| 3a | Angular 13→14 + Clarity 13（不动 Clarity，复用历史产物 `f669f58` 重新落地） | 已完成（`2363b0d`） |
| 3b | Angular 14→15 + Clarity 13（不动 Clarity，复用历史产物 `e3636fd` 重新落地） | 已完成（`6cbf918`） |
| 3c | Angular 15→16 + Clarity 13→16.6.0（复用历史产物 `7640300` 重新落地） | 已完成（`5ff451a`） |
| 3cR | 3c 视觉回归修复（日志页黑底灰字 + 头部下拉箭头错位） | 已完成（`8c203b4`） |
| 3d | Angular 16→17 + Clarity 16（不动 Clarity，复用历史产物 `9f334aa` 重新落地） | 已完成（`a3a3405`，本地未推送） |
| 4 | Angular 17→21 + Clarity 18.4（含 Angular 20 的 Clarity 空窗硬撑） | 待做 |
| 5 | zoneless 评估 + 废弃依赖清理 | 待做 |

每跳的依赖变化、官方迁移产物、手工修复项与踩坑记录，见 [docs/迁移进度.md](docs/迁移进度.md)。

## 构建注意事项（踩过坑）

1. **`npm install` 前先停掉 dev server**：webpack watcher 会占用 `node_modules/@clr/*` 下的文件，
   导致 npm 删除失败（报 `[safe-delete] ... trash operation ... aborted`）。
   查端口占用 `netstat -ano | grep :4200`，杀进程 `MSYS_NO_PATHCONV=1 taskkill /F /PID <pid>`。
2. **webpack 写精确版本、`@angular/*` 前缀写 `~`**：`@angular-devkit/build-angular`
   自身钉死一个精确的 webpack 版本（Angular 12/13 为 `5.50.0`，v14/v15 为 `5.76.1`），
   且 `@angular-devkit/build-webpack` 会直接 `require('webpack')`（因此不能删）。
   根依赖必须写**精确版本**，否则会出现「根目录一份 + 嵌套一份」的双实例安装。
   同理 `@angular/*` 一律写 `~` 不写 `^`：npm 上 `@angular/core` 常比 `@angular/cli`
   多出一个小版本（如 core 有 14.3.0 而 cli 止于 14.2.13），写 `^` 会造成 core / cli 错配。
   ⚠️ **Angular 14 的 CLI 迁移会主动把前缀改成 `^`**（迁移名 `update-angular-packages-version-prefix`），
   跑完必须改回 `~`，并用 `npm install --package-lock-only` 同步锁文件里的规格串。
3. **`--max_old_space_size` 不要调太大；但段错误也可能是间歇性的**：webpack 5 + 完整优化的
   组合下，过大的堆上限（如 8000）在部分机器上会**稳定**触发 V8 段错误
   （`Segmentation fault`，exit 139），当前脚本统一用 `4096`。
   但实测 4096 下仍**偶发**（8 次里 1 次），且与堆上限**无单调关系**（2048/3072/4096 都能通过）
   → **看到 `Segmentation fault` 且无任何 webpack/TS 报错时，先原样重跑**，不要急着改配置或查代码。
4. **生产构建报 `EPERM: operation not permitted, open '...json'`** —— 受限沙箱拦截了 babel-loader
   的缓存写入（v10–v12 的 ES5 差分加载链路），**换普通终端执行即可**。
   **v13 起移除差分加载、v14 起编译目标改 `es2020`（babel 版 build-optimizer 不再参与）→ 该链路彻底消失**，
   沙箱内已实测可直接构建。开发构建一直不受影响。
5. **Windows 等 `spawnSync` 受限环境**：Angular 12 的 esbuild 原生探测会因 `EBUSY` 失败并回落
   `esbuild-wasm`，导致生产构建无法完成。执行 `node tools/patch-esbuild-native-check.js`
   （幂等，支持 `--revert`；`npm install` 后跑一次）。
   **Angular 14 起上游已自行改用 `require('esbuild')` 探测，该脚本会检测到并直接跳过（exit 0），属正常输出**。
6. **本机 `ng update` 不可用**：它要装「临时 CLI」，走到 `spawnSync cmd.exe` 就稳定报 `EBUSY`
   （脱沙箱重试同样失败，非偶发）。等效流程：**手工改 `package.json` 版本 + `npm install`**，
   再用已装好的新 CLI 跑 `ng update <pkg> --migrate-only --from=<N-1> --to=N --allow-dirty`。
   ⚠️ 两点：v10 CLI 的开关是 `--migrate-only`（写成 `--migrations-only` 会被当成包名报错）；
   **v14 起要加 `NG_DISABLE_VERSION_CHECK=1` 并用裸包名**（带版本号的 spec 会被当成包名查依赖，
   报 `Package is not installed.`）。
7. **`npm ci` 可能长时间无输出**：实测曾挂在 `idealTree buildDeps` 阶段不再前进，改用 `npm install`。
   另注意 npm 的汇总行（`changed N packages`）与实际结果并不总是相符，
   **版本判定请以 `node -p "require('./node_modules/<pkg>/package.json').version"` 实测为准**。
8. **行尾统一 CRLF**：仓库无 `.gitattributes`（`core.autocrlf=true`）。
   用脚本批量改文件后，先用 `git diff --name-only` 导出清单，
   再执行 `node tools/normalize-eol.js <清单文件>` 归一，
   否则 diff 会被行尾噪声淹没，真正的内容改动反而看不见。
9. **Angular 13 移除了 UMD 包**，`@angular/*` 的入口全是 ESM（`fesm2015/*.mjs`，无 CJS）。
   因此任何**用 `require()` 加载 Angular 的 Node 侧脚本/夹具**都会踩两个坑：ESM 不支持
   目录导入（`rxjs/operators` 抛 `ERR_UNSUPPORTED_DIR_IMPORT`）、部分编译格式需要 JIT facade。
   现成解法见 `tools/esm-dir-import-loader.mjs` 与 `tools/verify-param-equivalence.js` 头部注释，
   新写这类脚本直接照抄即可。
10. **SCSS 弃用警告会随 Angular 升版突然变多**：内置 `sass` 随 Angular 逐跳抬高
    （1.49 → **1.54**（v14）→ **1.58**（v15））。当前链上实测 **6 条**（3c/v16 复核：仍为 6 条、同源），
    全部是 `:host > > > .selector` 这类「伪组合器」报 `… is invalid CSS. It will be omitted from the generated CSS.`，
    来源为**死代码** `src/app/portal/persistentvolumeclaim/snapshot-persistentvolumeclaim/`（未进产物）。
    > 历史 3b 落地时还曾出现 v15 新增的 `Using / for division outside of calc()` 警告
    > （来源 `admin/sidenav/sidenav.component.scss`）；本链的 `ee40ae7`（2b 回归修复）已把那处
    > 侧栏滚动条覆盖删掉、统一继承全局规则，故该警告在本链**不再出现**。
    两类警告在 **Sass 2.0 都会升级为硬错误**。**判据**：若该组件名在 `dist/main*.js` 里搜不到
    （已被 tree-shake），则影响面为零；当前 6 条均属此列，**留痕不改**。
11. **浏览器自动化用 Playwright 自带的 Chromium**：本机 Edge 被安全策略静默拦截
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
