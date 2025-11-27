@echo off
echo 设置 Node.js 环境变量以解决 OpenSSL 兼容性问题...
set NODE_OPTIONS=--openssl-legacy-provider
echo NODE_OPTIONS 已设置为: %NODE_OPTIONS%
echo 现在可以运行 npm start 或其他命令了 