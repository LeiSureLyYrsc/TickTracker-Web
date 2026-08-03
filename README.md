# TickTracker-Web

TickTracker 代肝记录系统的 WebUI 前端。基于 **React 19 + Vite + TypeScript + MUI v9**（Material Design 3 主题），路由使用 react-router-dom 7。

## 技术栈

- React 19 + TypeScript
- Vite
- MUI v9（@mui/material + @emotion）
- @material/material-color-utilities（Material You 调色）
- react-router-dom 7

## 功能

- 管理员 / 用户双端登录（管理员密码、用户 6 位验证码）
- 管理员：
  - 代肝数据：按用户聚合、按用户 ID 排序，支持按 ID / 用户名 / 别名搜索；游戏组应得次数与游戏已完成次数分开管理
  - 游戏管理：游戏组（创建 / 改名 / 删除 / 移动游戏）
  - 今日进度、留言管理、用户管理（QQ 绑定 / 别名）、系统设置
- 用户端：我的代肝（按游戏组展示应得与已完成）、今日进度、发送留言（仅已绑定游戏）
- Material Design 3 亮 / 暗主题 + 调色盘（Material You 种子色自定义）

## 开发

```sh
npm install
npm run dev        # 开发服务器，/api 代理到 http://127.0.0.1:8080
npm run typecheck  # tsc 类型检查
npm run build      # 构建
```

## 构建产物

`vite.config.ts` 将构建产物输出到 TickTracker 插件的 `webui/frontend` 目录，由插件的 FastAPI WebUI 直接托管。

构建产物已随插件仓库一起打包并推送到 GitHub（[TickTracker](https://github.com/LeiSureLyYrsc/TickTracker)），部署 TickTracker 插件即自带 WebUI，无需另行构建。

更新流程：修改前端代码 → `npm run build` → 提交插件仓库 `webui/frontend` 下的构建产物并推送。

## 环境要求

- Node.js >= 20
- 后端为 TickTracker 插件（NoneBot + FastAPI），提供 `/api` 接口
