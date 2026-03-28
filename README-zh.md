# fast-3mf-loader

[https://img.shields.io/npm/v/fast-3mf-loader.svg](https://www.npmjs.com/package/fast-3mf-loader)
[https://img.shields.io/badge/license-MIT-blue.svg](https://opensource.org/licenses/MIT)

一个高性能的3MF文件解析器，采用流式解析和 WebWorker 多线程技术，目标是用更低的内存占用获得更快的解析表现。使用 TypeScript 编写。

## 特性

- 🚀 **流式解析** - 支持分块加载和解析大文件，减少内存占用
- ⚡ **多线程处理** - 使用WebWorker实现并行解析，提升性能
- 📦 **轻量高效** - 优化的内存管理，特别适合处理大型3MF文件
- 🛠 **TypeScript支持** - 完全使用TypeScript编写，提供完整的类型定义
- 🌐 **浏览器兼容** - 可在现代浏览器中直接使用

## 安装

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
- `data`: 3MF文件数据，ArrayBuffer
- `options`: 可选配置对象
  - `workerCount`: number - 使用的 WebWorker 数量。默认会根据当前运行环境的并发能力自动推导，并在无法判断时回退到安全值。
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

## 基准测试

可以通过 `npm run build && npm run benchmark` 复现实测结果。

当前的基准流程和示例数据记录在 [docs/benchmarking.md](./docs/benchmarking.md) 中。文档里的数字来自 Apple Silicon / Node 22 上执行 `node scripts/benchmark.mjs` 的一次样本，适合作为可复现参考，而不是所有环境下的绝对承诺。

## 浏览器支持

支持所有现代浏览器（Chrome, Firefox, Safari, Edge等）以及支持WebWorker和Blob API的环境。

## 开发

```bash
# 克隆仓库
git clone https://github.com/Innovgame/fast-3mf-loader.git

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 运行测试
# npm test
```

## 贡献

欢迎提交Issue和Pull Request！请确保遵循项目的代码风格和测试覆盖率要求。
