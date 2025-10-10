# fast-3mf-loader

A high-performance 3MF file parser that uses stream parsing and WebWorker multi-threading technology, offering lower memory usage and faster parsing speed. Written in TypeScript.

## Features

- 🚀 **Stream Parsing** - Supports chunked loading and parsing of large files, reducing memory usage
- ⚡ **Multi-threaded Processing** - Uses WebWorker for parallel parsing to improve performance
- 📦 **Lightweight and Efficient** - Optimized memory management, especially suitable for large 3MF files
- 🛠 **TypeScript Support** - Fully written in TypeScript with complete type definitions
- 🌐 **Browser Compatible** - Can be used directly in modern browsers

## Installation

```bash
npm install fast-3mf-loader
# or
yarn add fast-3mf-loader
```

## Usage Example

```typescript
import { ThreeMFLoader, fast3mfBuilder } from 'fast-3mf-loader';

// Get file using fetch
const response = await fetch('path/to/model.3mf');
const buffer = await response.arrayBuffer();

// Parse 3MF file
const loader = new ThreeMFLoader();
const xmlData = await loader.parse(buffer, (progress) => {
  console.log(`Parsing progress: ${progress}%`);
});

const group = fast3mfBuilder(xmlData);
console.log('Parsing result:', group);
```

## API

### `ThreeMFLoader(data: Blob | ArrayBuffer, options?: ParseOptions): Promise<Model3MF>`

Parses 3MF file and returns model data.

**Parameters:**
- `data`: 3MF file data, ArrayBuffer
- `options`: Optional configuration object
  - `workerCount`: number - Number of WebWorkers to use
  - `onProgress`: (progress: number) => void - Progress callback function

**Return Value:**
Promise that resolves to an object containing 3D model data with the following structure:

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

## Performance Comparison

Compared to traditional 3MF parsers, fast-3mf-loader has significant advantages in large file processing:

| Metric                  | Traditional Parser | fast-3mf-loader |
| ----------------------- | ------------------ | --------------- |
| 100MB file parsing time | 8.0s               | 2.7s            |
| Peak memory usage       |                    |                 |
| CPU utilization         |                    |                 |

## Browser Support

Supports all modern browsers (Chrome, Firefox, Safari, Edge, etc.) and environments that support WebWorker and Blob API.

## Development

```bash
# Clone repository
git clone https://github.com/your-repo/fast-3mf-loader.git

# Install dependencies
npm install

# Development mode, develop test page
npm run dev

# Build production version
npm run build

# Run tests
npm test
```

## Contributing

Issues and Pull Requests are welcome! Please ensure you follow the project's code style and test coverage requirements.
