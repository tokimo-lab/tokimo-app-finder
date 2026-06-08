# tokimo-app-finder

Tokimo 文件管理器 — 文件浏览、收藏夹管理。

## 开发

```bash
# 后端
cargo build

# 前端
cd ui && pnpm install --ignore-workspace && pnpm build
```

## 架构

- 后端：Axum on UDS，SeaORM + PostgreSQL（`finder` schema）
- 前端：React + @tokimo/sdk + @tokimo/ui，Vite library mode
- API：`/api/apps/finder/favorites`（自有）+ `/api/vfs/*`（共享 VFS）
