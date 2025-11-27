# Frontend

项目通过 [Angular CLI](https://github.com/angular/angular-cli) 6.1.5 创建。
使用node v12.22.12 编译通过

## 环境要求

### Node.js 版本兼容性

- **推荐版本**: Node.js 16.x (LTS)
- **最低版本**: Node.js 12.x
- **最高版本**: Node.js 18.x (需要特殊配置)

### Node.js 18+ 兼容性解决方案

如果使用 Node.js 18 或更高版本，可能会遇到 OpenSSL 兼容性错误。解决方案：

#### 方案 1: 使用修改后的脚本（推荐）
```bash
npm run start  # 已自动添加 --openssl-legacy-provider 标志
```

#### 方案 2: 设置环境变量
```bash
# Windows
set NODE_OPTIONS=--openssl-legacy-provider
npm start

# Linux/Mac
export NODE_OPTIONS=--openssl-legacy-provider
npm start
```

#### 方案 3: 使用 nvm 切换到兼容版本
```bash
nvm use 16.20.0
npm start
```

## Development server
  **1. 克隆项目** 
  ``` bash
  git pull https://github.com/JLPAY/gwayne-dashboard.git
  ```

  **2.安装依赖**
  ```
  npm install
  ```

  **3.启动开发环境**
   ```
  npm run start
  ```
  **4.访问 http://localhost:4200**

## Build

执行 `npm run build` 去打包项目，打包结果会保存在 `dist/` 目录下。

## 常见问题

### OpenSSL 错误
如果遇到 `error:0308010C:digital envelope routines::unsupported` 错误：

1. 确保使用修改后的 npm 脚本
2. 或设置 `NODE_OPTIONS=--openssl-legacy-provider` 环境变量
3. 或降级到 Node.js 16.x 版本

### 内存不足
如果构建时遇到内存不足问题，可以增加内存限制：
```bash
node --max_old_space_size=8000 ./node_modules/@angular/cli/bin/ng build
```
