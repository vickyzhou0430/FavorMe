# 阿里云部署手册

本文面向首次部署 FavorMe 后端到阿里云。当前仓库的后端是 `backend/` 下的 **NestJS + Prisma + PostgreSQL** 服务；Phase 1 不依赖 Redis，Redis 只是后续限流/会话等能力的占位。

敏感信息不得提交到 Git：`API_TOKEN`、`DATABASE_URL`、`AI_API_KEY` 只能放在服务器环境变量、`backend/.env`、阿里云密钥管理或部署平台的环境变量配置中。

## 1. 推荐架构

首版建议用最简单、可排错的方式。**数据库有两种常见摆法**（二选一即可）：

| 组件 | 阿里云产品 | 作用 |
|------|------------|------|
| 后端运行 | ECS | 跑 Node.js/NestJS 进程 |
| 数据库（验证 / 省钱） | **同一台 ECS 上安装 PostgreSQL** | 与后端同机，仅本机或内网连库，适合先跑通链路与联调 |
| 数据库（正式上线推荐） | **RDS PostgreSQL** | 托管库、备份与高可用由云侧负责，应用仍部署在 ECS |
| HTTPS 入口 | Nginx + 免费证书/阿里云证书 | 把公网域名反代到本机 `127.0.0.1:3000` |
| AI 模型 | 火山方舟 / Doubao | 通过 OpenAI-compatible API 调用 |
| Redis | 暂不需要 | 当前代码未连接 Redis |

可以先在 ECS 上 **本机 PostgreSQL** 完成部署与接口验证，确认无误后再 **购买 RDS、迁移数据、把 `DATABASE_URL` 改为 RDS 内网地址**（步骤见 **第 2.4 节**）。不必为了第一次上线就必须买 RDS。

如果你熟悉 Docker，也可以后续改成“后端 Docker 镜像 + ECS/ACK/容器服务”部署；但当前仓库还没有后端 `Dockerfile`，所以本手册先按 **ECS 直接运行 Node.js** 写。仓库根目录的 `docker-compose.yml` 目前只用于本地开发机启动 PostgreSQL/Redis 依赖，**不是** ECS 生产部署文件；在 ECS 上更常见是直接安装 PostgreSQL 或使用 RDS。

## 2. 阿里云准备

### 2.1 创建 ECS

建议配置：

- 系统：Alibaba Cloud Linux 3、Ubuntu 22.04 或 Debian 12
- CPU/内存：MVP 可从 2 vCPU / 2GB 起步
- 磁盘：40GB 起步
- 安全组：
  - 开放 `22`：SSH 管理，只允许你的 IP 更好
  - 开放 `80` / `443`：HTTP/HTTPS
  - 不建议公网开放 `3000`，本机 Nginx 反代即可

### 2.2 创建 RDS PostgreSQL（正式上线推荐）

验证阶段可以 **暂不购买 RDS**，改用同一 ECS 上的本机 PostgreSQL（**第 2.3 节**）。正式上线仍建议单独使用 RDS：备份、规格升级与故障切换由云厂商托管，与应用进程解耦。

建议：

- PostgreSQL 版本：14、15、16 均可，优先选 16
- 创建数据库：`favorme`
- 创建独立账号：例如 `favorme_app`
- 白名单：加入 ECS 的内网 IP
- 优先使用 RDS **内网地址**，不要让数据库暴露公网

最终你需要得到类似这样的连接串：

```env
DATABASE_URL="postgresql://favorme_app:<密码>@<RDS内网地址>:5432/favorme?schema=public"
```

如果阿里云控制台要求 SSL，请按控制台说明补充参数。

### 2.3 ECS 本机 PostgreSQL（验证 / MVP）

在 **已有 ECS** 上直接安装 PostgreSQL，与 Nest 后端同机部署，用 **`127.0.0.1`** 连接即可，无需 RDS。适合：先验证 `DATABASE_URL`、迁移、`/v1/health`、Phase 1 接口，再上 RDS。

**安全注意**

- **安全组不要对公网开放 `5432`**。数据库只给本机后端用，监听 `127.0.0.1`（或仅内网）即可。
- 定期备份（至少 `pg_dump`）由你自己负责；ECS 磁盘故障或误操作会影响库——这也是后续迁 RDS 的主要原因。

以下以 **Ubuntu 22.04 / Debian** 为例（Alibaba Cloud Linux 可用对应 `dnf/yum` 安装 `postgresql`）。

**安装并启动**

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

**创建数据库与用户**（在 `postgres` 系统用户下执行 `psql`，或用 `sudo -u postgres psql`）：

```bash
sudo -u postgres psql -c "CREATE USER favorme_app WITH PASSWORD '你的强密码';"
sudo -u postgres psql -c "CREATE DATABASE favorme OWNER favorme_app;"
```

如发行版默认只允许 peer 连接，需本机密码认证时，编辑 **`/etc/postgresql/*/main/pg_hba.conf`**（路径因版本略不同），确保存在一行允许本机 TCP 密码登录，例如：

```text
host    favorme    favorme_app    127.0.0.1/32    scram-sha-256
```

修改后执行：

```bash
sudo systemctl reload postgresql
```

**`DATABASE_URL`（本机验证）**

```env
DATABASE_URL="postgresql://favorme_app:你的强密码@127.0.0.1:5432/favorme?schema=public"
```

密码中含 `@ # %` 等字符时，须做 [URL 编码](https://developer.mozilla.org/en-US/docs/Glossary/Percent-encoding) 后再写入连接串。

后端与数据库在同一台 ECS 时，Prisma 迁移、种子与健康检查与使用 RDS 时 **命令相同**，仅 `DATABASE_URL` 指向不同。

### 2.4 从本机 PostgreSQL 迁移到 RDS（以后）

思路：**新建 RDS 实例与库账号 → 迁数据 → 切换连接串 → 重启后端**。

1. 按 **第 2.2 节** 创建 RDS、数据库、账号与白名单（ECS 内网可访问 RDS）。
2. **停机或短时间停止写入**（避免迁移中途产生新数据；若可接受短暂不一致可跳过）。
3. 在 ECS 上对旧库做逻辑备份，例如：
   ```bash
   sudo -u postgres pg_dump -Fc -d favorme -f /tmp/favorme.dump
   ```
   或使用 `pg_dump` 以 **plain SQL** 导出，再用 `psql` 导入 RDS（具体以 RDS 控制台「连接信息」为准）。
4. 将备份恢复到 RDS（可用 `pg_restore` 或控制台提供的迁移工具；大库建议走阿里云数据迁移产品）。
5. 修改 `backend/.env` 中 **`DATABASE_URL`** 为 RDS 内网连接串，执行 `npm run prisma:deploy`（若 RDS 已是同一 schema，有时仅需校验；以迁移策略为准）。
6. `sudo systemctl restart favorme-backend`，用 **第 7.1 节** 健康检查与 Phase 1 curl 再验一遍。

若本机库仅有测试数据，也可以 **直接在 RDS 上空库执行 `npm run prisma:deploy`**，不再迁移旧数据。

## 3. 后端环境变量

在 ECS 上部署时，可以使用 `backend/.env`。进入仓库后从示例复制：

```bash
cd backend
cp .env.example .env
```

编辑 `backend/.env`：

```env
PORT=3000

# 后端业务接口鉴权。请生成一个长随机字符串，不要用示例值。
API_TOKEN=<生成一个长随机 token>

# PostgreSQL：RDS 或 ECS 本机二选一（见第 2 节）
# —— 阿里云 RDS（正式上线）
DATABASE_URL="postgresql://favorme_app:<密码>@<RDS内网地址>:5432/favorme?schema=public"
# —— 同一台 ECS 本机 PostgreSQL（验证）
# DATABASE_URL="postgresql://favorme_app:<密码>@127.0.0.1:5432/favorme?schema=public"

# 火山方舟 / Doubao
AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
AI_API_KEY=<你的 ARK_API_KEY>
AI_MODEL=doubao-seed-1-8-251228
```

变量含义：

| 变量 | 必填 | 含义 |
|------|------|------|
| `PORT` | 否 | 后端监听端口，默认 `3000` |
| `API_TOKEN` | 是 | App/调试脚本访问业务接口时的 Bearer token |
| `DATABASE_URL` | 是 | PostgreSQL 连接串，Prisma 用它访问数据库 |
| `AI_BASE_URL` | 是 | OpenAI-compatible API root；火山方舟为 `https://ark.cn-beijing.volces.com/api/v3` |
| `AI_API_KEY` | 是 | 火山官网示例中的 `ARK_API_KEY`，填到这个统一变量里 |
| `AI_MODEL` | 是 | 当前模型：`doubao-seed-1-8-251228` |

## 4. ECS 首次部署

以下步骤在 ECS 上执行。

### 4.1 安装基础软件

Ubuntu/Debian 示例：

```bash
sudo apt update
sudo apt install -y git curl nginx
```

安装 Node.js 20。可用 NodeSource：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

确认 `node -v` 是 `v20.x` 或更高。

### 4.2 拉代码

选择一个部署目录，例如：

```bash
sudo mkdir -p /opt/favorme
sudo chown -R $USER:$USER /opt/favorme
cd /opt/favorme
git clone <你的仓库地址> .
```

如果是私有仓库，先在 ECS 上配置 SSH key 或使用你团队允许的拉取方式。

### 4.3 安装依赖

```bash
cd /opt/favorme/backend
npm ci
```

`npm ci` 会按 `package-lock.json` 精确安装依赖，适合部署环境。

### 4.4 配置环境变量

```bash
cp .env.example .env
nano .env
```

把 `DATABASE_URL`、`API_TOKEN`、`AI_API_KEY` 改成真实值。

### 4.5 生成 Prisma Client

```bash
npx prisma generate
```

这一步根据 `backend/prisma/schema.prisma` 生成数据库访问客户端。代码访问数据库前必须有它。

### 4.6 执行数据库迁移

```bash
npm run prisma:deploy
```

这会把 `backend/prisma/migrations/` 里的迁移应用到当前 `DATABASE_URL` 指向的 PostgreSQL（RDS 或 ECS 本机库）。首次部署必须执行，否则表不存在。

可选：写入种子数据。

```bash
npm run prisma:seed
```

### 4.7 编译后端

```bash
npm run lint
npm run test:insight-submit
npm run build
```

含义：

- `npm run lint`：检查代码质量
- `npm run test:insight-submit`：检查三问 submit 完整性校验
- `npm run build`：编译 NestJS，产物在 `backend/dist/`

### 4.8 启动服务

当前 `package.json` 还没有 `start:prod` 脚本，生产启动命令是：

```bash
node dist/main.js
```

临时验证可直接运行。长期运行建议用 `systemd` 托管。

## 5. 用 systemd 常驻运行

创建服务文件：

```bash
sudo nano /etc/systemd/system/favorme-backend.service
```

填入：

```ini
[Unit]
Description=FavorMe Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/favorme/backend
EnvironmentFile=/opt/favorme/backend/.env
ExecStart=/usr/bin/node /opt/favorme/backend/dist/main.js
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

如果 `node` 不在 `/usr/bin/node`，用下面命令查看真实路径：

```bash
which node
```

然后把 `ExecStart` 里的路径改成实际结果。

授权并启动：

```bash
sudo chown -R www-data:www-data /opt/favorme
sudo systemctl daemon-reload
sudo systemctl enable favorme-backend
sudo systemctl start favorme-backend
sudo systemctl status favorme-backend
```

查看日志：

```bash
sudo journalctl -u favorme-backend -f
```

## 6. 配置 Nginx 和域名

假设你的 API 域名是 `api.example.com`。

创建 Nginx 配置：

```bash
sudo nano /etc/nginx/sites-available/favorme-api
```

填入：

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用：

```bash
sudo ln -s /etc/nginx/sites-available/favorme-api /etc/nginx/sites-enabled/favorme-api
sudo nginx -t
sudo systemctl reload nginx
```

HTTPS 可以使用阿里云 SSL 证书或 `certbot`。生产环境必须使用 HTTPS。

## 7. 部署后验证

### 7.1 健康检查

```bash
curl -s http://127.0.0.1:3000/v1/health
```

或通过域名：

```bash
curl -s https://api.example.com/v1/health
```

期望数据库正常时返回：

```json
{"status":"ok","database":"up"}
```

如果返回 503，优先检查：

- `DATABASE_URL` 是否正确
- 若使用 **RDS**：白名单是否包含 ECS 内网 IP；RDS 上数据库与账号是否已创建
- 若使用 **ECS 本机 PostgreSQL**：`postgresql` 服务是否 `active`（`systemctl status postgresql`）；本机能否 `psql` 用同一连接串连接；安全组是否误把业务流量拦了（库应走 `127.0.0.1`，一般无需对外开放 `5432`）
- 是否执行过 `npm run prisma:deploy`

### 7.2 Phase 1 golden path

在本机或 ECS 上设置：

```bash
export API_BASE_URL=https://api.example.com
export API_TOKEN=<你的 API_TOKEN>
export DEVICE_ID=dev-device-001
```

用户 bootstrap：

```bash
curl -s -X POST "$API_BASE_URL/v1/users/bootstrap" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "X-Device-Id: $DEVICE_ID"
```

生成三问：

```bash
curl -s -X POST "$API_BASE_URL/v1/insight/questions" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "X-Device-Id: $DEVICE_ID" \
  -H "Content-Type: application/json" \
  -d '{"rawQuestion":"我要不要换工作？","inputMode":"text"}'
```

从返回中取出完整 `questions` 数组，再提交三题答案：

```bash
curl -s -X POST "$API_BASE_URL/v1/insight/submit" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "X-Device-Id: $DEVICE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "rawQuestion": "我要不要换工作？",
    "questions": [
      {
        "id": "q1",
        "dimension": "inner_preference",
        "title": "如果只听真实直觉，你更靠近哪边？",
        "options": [
          { "id": "stay", "label": "保持现状" },
          { "id": "change", "label": "尝试变化" }
        ]
      },
      {
        "id": "q2",
        "dimension": "fear_boundary",
        "title": "你最不能接受的风险是什么？",
        "options": [
          { "id": "income", "label": "收入短期不稳定" },
          { "id": "growth", "label": "继续错过成长机会" }
        ]
      },
      {
        "id": "q3",
        "dimension": "active_vs_avoidance",
        "title": "这次选择更像靠近想要，还是逃离压力？",
        "options": [
          { "id": "toward", "label": "靠近更想要的状态" },
          { "id": "away", "label": "逃离当前压力" }
        ]
      }
    ],
    "answers": [
      { "questionId": "q1", "optionId": "change" },
      { "questionId": "q2", "optionId": "growth" },
      { "questionId": "q3", "optionId": "toward" }
    ]
  }'
```

期望返回非空 `conclusion`。真实联调时，`questions` 应使用上一步接口实际返回的内容。

## 8. 后续更新部署

代码更新后：

```bash
cd /opt/favorme
git pull
cd backend
npm ci
npx prisma generate
npm run prisma:deploy
npm run lint
npm run test:insight-submit
npm run build
sudo systemctl restart favorme-backend
sudo systemctl status favorme-backend
```

如果更新失败：

- `git log --oneline -5` 找到上一个可用提交
- `git checkout <commit>` 回退代码
- 重新 `npm ci && npm run build`
- `sudo systemctl restart favorme-backend`

数据库迁移一旦执行，不能简单用 `git checkout` 回滚数据库结构；生产环境执行迁移前要确认备份。

## 9. Docker 说明

你之前部署 OpenClaw 用 Docker，是因为它通常已经提供完整镜像或 `Dockerfile`。当前 FavorMe 仓库的 `docker-compose.yml` 只用于**开发机**本地依赖：

- PostgreSQL
- Redis

它没有构建后端应用镜像，也不适合作为 ECS 生产部署文件。在 ECS 上若不想用 RDS，更常见做法是 **第 2.3 节** 直接安装 PostgreSQL，而不是在同一台 ECS 上再叠一层 Compose 跑库（除非团队统一用容器运维）。

如果后续要改成 Docker 部署，需要新增：

- `backend/Dockerfile`
- `.dockerignore`
- 生产用 `docker-compose.yml` 或阿里云容器服务配置
- 镜像构建和推送流程，例如推到阿里云 ACR

正式上线仍建议 PostgreSQL 使用 **RDS**；若暂时用 **ECS 本机 PostgreSQL**，应避免仅依赖 Compose 叠在同一宿主机而不做备份策略。

## 10. 上线前检查清单

- [ ] ECS 安全组只开放必要端口：`22`、`80`、`443`（**不要**对 `0.0.0.0/0` 开放 `5432`）
- [ ] Nginx 已启用 HTTPS
- [ ] `backend/.env` 权限受控，密钥未提交 Git
- [ ] 若已使用 **RDS**：已配置备份策略；白名单只允许 ECS 或可信来源
- [ ] 若暂用 **ECS 本机 PostgreSQL**：已至少有一次可恢复的备份方案（如 `pg_dump` 定时任务或快照策略）
- [ ] `npm run prisma:deploy` 已成功
- [ ] `GET /v1/health` 返回 database up
- [ ] Phase 1 golden-path curl 已通过
- [ ] 火山方舟 API Key 可用且额度正常
- [ ] `01-REVIEW.md` 中的 submit 快照防篡改风险已接受或已修复
