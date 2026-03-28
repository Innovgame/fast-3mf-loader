# fast-3mf-loader

[https://img.shields.io/npm/v/fast-3mf-loader.svg](https://www.npmjs.com/package/fast-3mf-loader)
[https://img.shields.io/badge/license-MIT-blue.svg](https://opensource.org/licenses/MIT)

一个高性能的3MF文件解析器，采用流式解析和WebWorker多线程技术，内存占用更低，解析速度更快。使用TypeScript编写。

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
  - `workerCount`: number - 使用的WebWorker数量
  - `onProgress`: (progress: number) => void - 进度回调函数

**返回值:**
Promise解析为包含3D模型数据的对象，结构如下：

```typescript
type ParseOptions = {
    workerCount?: number;
    onProgress?: (progress: number) => void;
};

interface Model3MF {
    rels: {
        target: string | null;
        id: string | null;
        type: string | null;
    }[];
    modelRels: {
        target: string | null;
        id: string | null;
        type: string | null;
    }[] | undefined;
    model: {
        [key: string]: ModelPart3MF;
    };
    printTicket: {};
    texture: {
        [key: string]: ArrayBuffer;
    };
}

interface ModelPart3MF {
            unit: string | undefined;
            version: string | undefined;
            transform: {};
            metadata: {};
            resources: {
                object: {
                    [key: string]: ObjectType;
                };
                basematerials: {
                    [key: string]: BasematerialsType;
                };
                texture2d: {
                    [key: string]: Texture2dType;
                };
                colorgroup: {
                    [key: string]: ColorGroupType;
                };
                texture2dgroup: {
                    [key: string]: Texture2dGroupType;
                };
                pbmetallicdisplayproperties: {
                    [key: string]: any;
                };
            };
            build: BuildItemType[];
            extensions: {
                [key: string]: string;
            };
            requiredExtensions: string | undefined;
}
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

## 性能对比

与传统的3MF解析器相比，fast-3mf-loader在大型文件处理上有显著优势：

| 指标              | 传统解析器 | fast-3mf-loader |
| ----------------- | ---------- | --------------- |
| 100MB文件解析时间 |            |                 |
| 内存峰值占用      |            |                 |
| CPU利用率         |            |                 |

## 浏览器支持

支持所有现代浏览器（Chrome, Firefox, Safari, Edge等）以及支持WebWorker和Blob API的环境。

## 开发

```bash
# 克隆仓库
git clone https://github.com/your-repo/fast-3mf-loader.git

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
