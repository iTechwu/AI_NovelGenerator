# 将项目发包到 npm

本文说明如何将本仓库中的包（以 `create-dofe-ai` 为例）发布到 npm，以便他人通过 `npx create-dofe-ai my-app` 使用。

## 一、前置条件

1. **npm 账号**：在 [npmjs.com](https://www.npmjs.com) 注册并完成邮箱验证。
2. **本地登录**：在终端执行 `npm login`，按提示输入用户名、密码、邮箱与验证码。

```bash
npm login
# 或使用 pnpm（会走 npm 的 registry）
pnpm login
```

3. **确认 registry**：确保未使用淘宝等镜像发布（发布必须用官方源）：

```bash
npm config get registry   # 应为 https://registry.npmjs.org/
# 若为其它源，临时改回再发布：
npm publish --registry=https://registry.npmjs.org/
```

## 二、发布 create-dofe-ai

该包用于 `npx create-dofe-ai <项目名>`，发布前需先把「模板」打进包内。

### 1. 在仓库根目录生成模板

模板目录 `packages/create-dofe-ai/template/` 不提交到 git，发布前必须执行一次：

```bash
# 在仓库根目录（dofe-ai）
pnpm run export-scaffold
```

会把当前 git 跟踪的文件（除 `packages/create-dofe-ai/` 自身）导出到 `packages/create-dofe-ai/template/`。

### 2. 进入包目录并发布

```bash
cd packages/create-dofe-ai
npm publish
```

若首次发布且包名为 `create-dofe-ai`，需确认该名在 npm 上未被占用；若被占用，可在 `package.json` 中改为 scope 包，例如 `@你的npm用户名/create-dofe-ai`，则发布命令为：

```bash
npm publish --access public
```

（scope 包默认视为 private，公开需加 `--access public`。）

### 3. 发布前自检（可选）

在 `packages/create-dofe-ai` 下执行：

```bash
npm pack --dry-run
```

会列出将要打进 tarball 的文件，确认包含 `cli.js`、`template/`、`README.md`。

## 三、完整流程示例

```bash
# 1. 在仓库根目录
pnpm run export-scaffold

# 2. 进入包目录
cd packages/create-dofe-ai

# 3. 按需改版本号（避免与已有版本冲突）
# 在 package.json 中改 "version": "0.1.0" → "0.1.1" 等

# 4. 发布（使用官方 registry）
npm publish
# 若为 scope 包：
# npm publish --access public
```

## 四、后续更新版本

1. 在 `packages/create-dofe-ai/package.json` 中更新 `version`（如遵循 [语义化版本](https://semver.org/lang/zh-CN/)）。
2. 若仓库内容有变更，在根目录重新执行 `pnpm run export-scaffold`，再进入该包目录执行 `npm publish`。

## 五、根项目与其它包

- 根目录 `package.json` 已设置 `"private": true`，不会被发布。
- `apps/*`、`packages/*` 中其它包（如 `@repo/contracts`、`@repo/utils`）若需单独发布，需在对应包的 `package.json` 中设置可发布的 `name`（如 `@你的scope/contracts`），并在该目录下执行 `npm publish`。是否发布依团队需求而定。

## 六、常见问题

| 情况                                                                                 | 处理                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `404 Not Found`（用户执行 npx 时）                                                   | 包尚未发布或包名写错，先按本文完成发布再让用户使用 `npx create-dofe-ai my-app`。                                                                                                                                                                                                                                                                                                                                                  |
| `403 Forbidden - Two-factor authentication or granular access token...`              | **npm 强制要求**：发布包须开启账号的**双因素认证（2FA）**，或使用具备「绕过 2FA」的 **Granular Access Token**。处理：① 登录 [npmjs.com](https://www.npmjs.com) → Account → Enable 2FA，用 OTP 或 WebAuthn 完成验证后再执行 `npm publish`；② 或到 [Access Tokens](https://www.npmjs.com/settings/~/tokens) 新建 **Granular token**，勾选「Bypass 2FA for publish」等发布权限，用 `npm login --auth-type=legacy` 填该 token 作密码再发布。 |
| `403 Forbidden`（非 2FA 提示）                                                       | 无权限发布该包名，换名或改用 scope 包（如 `@用户名/create-dofe-ai`）并 `npm publish --access public`。                                                                                                                                                                                                                                                                                                                            |
| `402 Payment Required`                                                               | 若使用 scope 且未付费，需加 `--access public` 发布为公开包。                                                                                                                                                                                                                                                                                                                                                                             |
| 发布时提示 `"bin[create-dofe-ai] script name bin.js was invalid and removed"` | 本包已改为使用 `"bin": "./cli.js"` 及入口文件 `cli.js`，不再使用 `bin.js`，以免被 npm 当成无效 script 名而移除。若你 fork 后仍见该警告，请确认 `package.json` 的 `bin` 指向 `./cli.js`，且入口文件名为 `cli.js`。                                                                                                                                                                                                                        |
| 发布后用户拉到的模板是旧的                                                           | 发布前必须在根目录执行过 `pnpm run export-scaffold`，再在包目录执行 `npm publish`。                                                                                                                                                                                                                                                                                                                                                      |
