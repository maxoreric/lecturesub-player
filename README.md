# 📺 LectureSub Player

LectureSub Player 是一个专为双语学习设计的全栈视频播放器。它支持双视频同步播放（例如：PPT 画面 + 老师画面）、双语 VTT 字幕，并具备动态课程管理与上传功能。

## ✨ 核心特性

- **双视频联动**：支持 PPT 演示和录像同步播放，支持画中画（PiP）布局与大小动态调整。
- **智能双语字幕**：
    - 自动关联视频进度。
    - 支持全文搜索与快速跳转。
    - 滚轮控制字幕区域滚动不干扰播放。
    - 支持自定义高亮颜色。
- **动态播放列表**：基于 `lectures.json` 的课程管理，无需刷新页面即可秒切课程。
- **全栈上传系统**：集成 Node.js 后端，支持直接通过浏览器上传视频和 VTT 文件。
- **个性化持久化**：自动保存面板宽度、播放速度、字幕颜色及上次播放进度。
- **深度链接**：支持 URL 参数（如 `?lec=id`）直接访问特定课程。

## 🛠 技术栈

- **Frontend**: Vite + TypeScript + Vanilla CSS
- **Backend**: Node.js + Express + Multer
- **Storage**: 本地文件系统 (uploads 目录 + JSON 数据库)

---

## 🚀 部署指南 (Server Deployment)

### 1. 环境准备
确保服务器已安装 `Node.js` (v18+) 和 `git`。

### 2. 获取代码并安装
```bash
git clone https://github.com/maxoreric/lecturesub-player.git
cd pi-mono-player
npm install
```

### 3. 编译发布
```bash
npm run build
```

### 4. 启动服务 (推荐使用 PM2)
```bash
# 安装 PM2
npm install -g pm2

# 启动全栈服务器
pm2 start server.mjs --name "lecture-player"

# 保存状态
pm2 save
```
服务默认运行在 `http://localhost:3000`。

---

## 💻 本地开发

```bash
# 启动开发服务器 (Vite)
npm run dev

# 启动后端服务 (处理上传)
node server.mjs
```

---

## 📖 使用说明

### 上传新课程
1. 点击顶部导航栏的 **"Upload 🔼"**。
2. 输入课程标题。
3. 选择对应的 PPT 视频、老师视频和双语 VTT 字幕文件。
4. 等待进度条完成后，课程会自动出现在侧边栏。

### 快捷键支持
- `Space`: 播放 / 暂停
- `Arrow Left / Right`: 快退 / 快进 5 秒
- `F`: 全屏切换
- `M`: 静音 / 取消静音
- `双击视频`: 进入 / 退出全屏

### 目录结构
- `/public/uploads`: 用户上传的媒体文件存放处。
- `/public/lectures.json`: 课程元数据数据库。
- `server.mjs`: 后端 Express 逻辑。

---

## 📄 License
MIT
