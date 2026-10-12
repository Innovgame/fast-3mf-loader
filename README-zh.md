# fast-3mf-loader

[English](README.md) | [简体中文](README-zh.md)

[![CI](https://github.com/Innovgame/fast-3mf-loader/actions/workflows/ci.yml/badge.svg)](https://github.com/Innovgame/fast-3mf-loader/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/fast-3mf-loader)](https://www.npmjs.com/package/fast-3mf-loader)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

一个面向现代浏览器的 TypeScript 3MF 解析库，内部采用 SAX 风格流式解析与 WebWorker 并行处理，在大型 archive 上兼顾性能与较低内存占用。

## 特性

- 🚀 **流式导向解析** - 内部采用 SAX 风格流式解析，在大型 3MF archive 上帮助降低内存压力
- ⚡ **WebWorker 并行处理** - 使用自动调节规模的 worker pool 并行解析 model parts
- 📦 **基准支撑的效率** - 针对纹理密集与组件密集 fixture 提供实测优化
- 🛠 **稳定的 TypeScript 接口** - 导出 `Fast3MFLoader`、`fast3mfBuilder` 及文档中列出的辅助类型
- 🌐 **浏览器优先运行时** - 面向支持 `Worker` 与 `Blob` 的现代浏览器

## 安装

当前版本 `0.0.7`。变更记录见 [CHANGELOG.md](CHANGELOG.md)。

```bash
npm install fast-3mf-loader
# 或
yarn add fast-3mf-loader
```

## 使用示例

```typescript
import { Fast3MFLoader, fast3mfBuilder } from "fast-3mf-loader";

// 使用fetch获取文件
const response = await fetch("path/to/model.3mf");
const buffer = await response.arrayBuffer();

// 解析3MF文件
const loader = new Fast3MFLoader();
const data3mf = await loader.parse(buffer, {
  onProgress(progress) {
    console.log(`解析进度: ${progress}%`);
  },
});

const group = fast3mfBuilder(data3mf);
console.log("解析结果:", group);
```

## API

### `Fast3MFLoader#parse(data: ArrayBuffer, options?: ParseOptions): Promise<Model3MF>`

解析3MF文件并返回模型数据。

**参数:**
- `data`: 3MF文件数据，`ArrayBuffer`。传入其他输入类型时会直接抛出 loader-facing error。
- `options`: 可选配置对象
  - `workerCount`: number - 使用的 WebWorker 数量。默认会根据当前运行环境的并发能力自动推导，并在无法判断时回退到安全值。传入非法值时会给出 warning 并回退到默认策略。
  - `onProgress`: (progress: number) => void - 进度回调函数

**返回值:**
Promise 解析为 `Model3MF`。包中同时导出了 `Model3MF` 这个面向文档的 `ParseResult` 别名，以及相关辅助类型 `ParseOptions`、`ParsedModelPart`、`Relationship`。

```typescript
import type {
  Model3MF,
  ParseOptions,
  ParsedModelPart,
  Relationship,
} from "fast-3mf-loader";

type Model3MF = {
  rels: Relationship[];
  modelRels?: Relationship[];
  model: Record<string, ParsedModelPart>;
  printTicket: Record<string, never>;
  texture: Record<string, ArrayBuffer>;
};
```

可以通过 `fast3mfBuilder(data3mf)` 将解析结果转换成 `THREE.Group`。

## 支持矩阵

当前支持范围记录在 [docs/support-matrix.md](./docs/support-matrix.md)。

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| 基础材质 | 已支持 | 可构建为 Three.js 材质 |
| 纹理组 | 已支持 | 由 `multipletextures.3mf` 覆盖 |
| 顶点色 | 已支持 | 由 `vertexcolors.3mf` 覆盖 |
| 组件装配 | 已支持 | 由 `truck.3mf` 覆盖 |
| Print Ticket | 暂不支持 | 当前返回空对象并给出警告 |

## 支持边界

当前支持范围以 fixture-backed behavior 为准，并记录在 [docs/support-matrix.md](./docs/support-matrix.md) 中。
包括 Print Ticket 和超出当前 fixture coverage 的 extension resources 在内的能力，在文档明确说明前都应视为未支持。

## 基准测试

可以通过 `pnpm build && pnpm benchmark` 复现实测结果。

当前的基准流程和示例数据记录在 [docs/benchmarking.md](./docs/benchmarking.md) 中。文档里的数字来自 Apple Silicon / Node 22 上执行 `node scripts/benchmark.mjs` 的一次样本，适合作为可复现参考，而不是所有环境下的绝对承诺。

## 浏览器支持

支持所有现代浏览器（Chrome, Firefox, Safari, Edge等）以及支持WebWorker和Blob API的环境。

## 运行时说明

- 面向支持 `Worker` 与 `Blob` 的现代浏览器
- 如果当前运行时无法初始化 inline worker，解析会抛出直接指向 `Worker` / `Blob` 前提的 loader-facing error
- `workerCount` 默认使用 `min(hardwareConcurrency - 1, 15)`，无法判断时安全回退到 `4`
- 非法 `workerCount` 会给出 warning，并回退到默认 worker 策略
- 当前未支持能力会通过 warning 明确提示，而不是静默伪装为成功

## 开发

需要 Node.js 22 和 pnpm 10。

```bash
git clone https://github.com/Innovgame/fast-3mf-loader.git
pnpm install
pnpm dev
```

```bash
pnpm verify
pnpm test
pnpm build
```

仓库是 pnpm workspace。`packages/fast-3mf-loader` 是发布到 npm 的库。`apps/demo` 是浏览器测试页。

推送到 `master` 的提交，以及目标分支为 `master` 的 pull request，会运行 [CI](.github/workflows/ci.yml)。`master` 上的 CI 成功后，测试页会发布到 <https://innovgame.github.io/fast-3mf-loader/>。

## 文档

- [文档索引](docs/README.md)
- [支持矩阵](docs/support-matrix.md)
- [基准测试](docs/benchmarking.md)
- [示例](examples/README.md)

维护者笔记在 `docs/superpowers/`，不是使用说明。

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)、[SECURITY.md](SECURITY.md) 和 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## 许可证

[MIT](LICENSE)
