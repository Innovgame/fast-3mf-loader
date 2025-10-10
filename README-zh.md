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
import { ThreeMFLoader, fast3mfBuilder } from 'fast-3mf-loader';

// 使用fetch获取文件
const response = await fetch('path/to/model.3mf');
const buffer = await response.arrayBuffer();

// 解析3MF文件
const loader = new ThreeMFLoader();
const xmlData = await loader.parse(buffer, (progress) => {
  console.log(`解析进度: ${progress}%`);
});

const group = fast3mfBuilder(xmlData);
console.log('解析结果:', group);
```

## API

### `ThreeMFLoader(data: Blob | ArrayBuffer, options?: ParseOptions): Promise<Model3MF>`

解析3MF文件并返回模型数据。

**参数:**
- `data`: 3MF文件数据，ArrayBuffer
- `options`: 可选配置对象
  - `workerCount`: number - 使用的WebWorker数量
  - `onProgress`: (progress: number) => void - 进度回调函数

**返回值:**
Promise解析为包含3D模型数据的对象，结构如下：

```typescript
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
        [key: string]: {
            current: {
                currentObjectId: string;
                currentBasematerialsId: string;
                currentColorGroupId: string;
                currentTexture2dGroupId: string;
            };
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
        };
    };
    printTicket: {};
    texture: {
        [key: string]: ArrayBuffer;
    };
}
```

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