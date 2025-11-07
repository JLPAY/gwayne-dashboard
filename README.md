# Frontend

项目通过 [Angular CLI](https://github.com/angular/angular-cli) 8 创建。
使用node v18.20.5 编译通过

## 环境要求

### Node.js 版本兼容性
- **最高版本**: Node.js 18.20.5 

### Node.js 18+ 兼容性解决方案

如果使用 Node.js 18 或更高版本，可能会遇到 OpenSSL 兼容性错误。解决方案：

#### 方案 1: 使用修改后的脚本（推荐）
```bash
pnpm install @types/lodash@4.14.108 @clr/angular@2.0.3 @clr/icons@2.0.3 @clr/ui@2.0.3 --save-dev

pnpm run start 
```
  **4.访问 http://localhost:4200**

## Build

执行 `pnpm run build` 去打包项目，打包结果会保存在 `dist/` 目录下。  


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
