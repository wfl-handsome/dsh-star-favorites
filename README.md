# dsh-star-favorites

给 DSH Web 界面里**自己发的消息**加星标收藏，并在右侧 **turn rail（轮次导航条）** 对应横线左侧显示一颗金色星标，方便快速定位。

> 非官方插件，与 DeepSeek 无从属关系。

## 功能

- 每条**用户消息**的「复制」按钮右侧新增一个星标按钮（空心 ☆ / 实心 ★ 圆角图标）；
- 收藏状态持久化在浏览器 `localStorage`（键 `dsh.star.msg.v1`），刷新、重启后仍在；
- 收藏后，右侧 turn rail 上对应那一轮横线的**左侧**出现同款金色星标，随 rail 滚动对齐；
- 点击 rail 上的星标，可跳回对应消息；
- 星标严格跟随**当前渲染出来的横线**：横线滚出可视区即隐藏，避免出现“幽灵星标”。

## 安装

```bash
# 从 GitHub 安装（推荐钉定 commit 以便复现）
dsh plugin --profile web add "github:OWNER/dsh-star-favorites#<commit-sha>"

# 或本地目录开发调试
dsh plugin --profile web add link:/path/to/dsh-star-favorites
```

安装后**重启 `dsh web`**（桌面端重开客户端），并在浏览器按 `Ctrl+F5` 硬刷新。

## 使用

1. 在你发送的消息下方，点击「复制」旁边的 **☆**；
2. 星标变为 **★**，右侧 turn rail 对应横线左侧出现金色 ★；
3. 点击 rail 上的 ★ 可跳转到该消息；再次点击消息下方的 ★ 取消收藏。

## 实现说明

- 纯 **Client 插件**（`dsh.client.platform = "web"`，`immediately: true`），宿主半为空实现；
- 通过 `data-chat-flow-kind="user"` / `data-chat-turn` 定位用户消息；
- 通过 `button[aria-label*="第 N 轮"]` 找到 rail 横线，读取其 `getBoundingClientRect()` 对齐星标；
- 星标使用 `position: fixed` 覆盖层渲染，避免被 rail 容器的 `overflow` 裁剪；
- 滚动时同步刷新坐标，保证跟手。

## 兼容性

- 依赖 DSH Web UI 的 DOM 结构（`data-chat-*`、`SNx2jG_mark` 等 class 前缀），**DSH 升级后可能失效**；
- 仅在 DSH 0.2.x 的 Web 界面验证过；
- 只对 Web GUI 生效，不影响 CLI / 会话数据。

## 目录结构

```
dsh-star-favorites/
├── package.json
├── cordis.patch.yml     # bundle patch：向 profile 插入插件条目
├── lib/
│   ├── index.js         # 宿主半：空实现
│   └── client.js        # 浏览器半：注入星标 / 持久化 / rail 标记
├── LICENSE
└── README.md
```

## 已知限制

- 收藏的轮次若不在 rail 的虚拟化渲染窗口内，不会显示星标（避免错误定位）；
- 星标位置按横线实际坐标计算，DSH 若改变 rail 的定位方式（例如不再使用 `translate3d`）需要同步调整。

## License

MIT
