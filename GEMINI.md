# MadCore 项目规范 (GEMINI.md)

本项目是一个基于 **Tauri V2** 框架打造的个人生活信息与数据管理面板。旨在通过现代化的 UI 设计和高效的 Rust 后端，实现个人数据的可视化与深度管理。

## 1. 核心技术栈
- **后端 (Backend):** Rust (Tauri V2)
- **前端 (Frontend):** React 19 + TypeScript + Vite
- **通信:** Tauri Command (IPC) & Tauri Events
- **构建工具:** npm + cargo

## 2. 项目愿景与架构导向
MadCore 不仅仅是一个应用，它是一个**管理视图 (Management View)** 和 **仪表盘 (Dashboard)**。
- **UI 设计:** 追求现代、直观、响应式的仪表盘风格。强调信息层级、卡片式布局和交互式反馈。
- **数据管理:** 核心逻辑尽可能下沉至 Rust 后端，确保数据处理的高效与安全。
- **安全性:** 遵循 Tauri V2 的权限模型，通过 `capabilities` 细粒度管理功能。

## 3. 开发准则与强制要求 (Mandates)

### 3.1 架构分离 (Concerns)
- **UI 只负责展示:** React 前端应专注于界面呈现和简单的交互逻辑。
- **Rust 负责重逻辑:** 复杂的数据计算、文件系统操作、系统级调用应通过 `tauri::command` 在 Rust 中实现。
- **异步处理:** 耗时任务必须在 Rust 中异步执行，避免阻塞前端 UI 线程。

### 3.2 命名规范
- **Rust:** 遵循 Rust 标准命名规范（`snake_case` 用于函数和变量，`PascalCase` 用于结构体）。
- **TypeScript/React:** 遵循 React 社区规范（`PascalCase` 用于组件，`camelCase` 用于函数和变量）。
- **Tauri Commands:** 在前端调用时使用 `invoke('command_name')`，Rust 端定义为 `#[tauri::command] fn command_name() {}`。

### 3.3 目录结构
- `/src`: 前端 React 代码。
- `/src-tauri`: Rust 后端代码。
- `/src-tauri/capabilities`: 存放 Tauri V2 的权限配置文件。

### 3.4 Tauri V2 特性利用
- **插件化:** 优先寻找或编写 Tauri 插件来扩展功能（如 `tauri-plugin-sql`, `tauri-plugin-store` 等）。
- **安全性:** 禁止在前端直接开启危险权限，所有特权操作必须通过 Rust 后端的 Command 并经过权限校验。

## 4. 关键工作流
- **本地开发:** 使用 `npm run tauri dev` 启动开发服务器和 Tauri 窗口。
- **类型同步:** 确保 Rust 定义的数据结构通过 `serde` 进行序列化，并在 TypeScript 中定义对应的 `interface`。
- **状态管理:** 仪表盘级别的全局状态建议使用轻量级的 React Context 或状态管理库，并结合 Tauri Events 实现跨端状态同步。

## 5. UI/UX 指导
- **美学:** 采用深色模式优先（Dark Mode First）或支持无缝切换。
- **响应式:** 界面需适配不同尺寸的窗口。
- **动效:** 关键数据的加载应有优雅的占位符（Skeleton Screens）和过渡动画。
