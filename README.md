
# 3D Model Viewer

A modern, feature-rich 3D model viewer built with React, TypeScript, and Three.js. This application allows users to load, view, and interact with various 3D model formats in a web browser.

## Features

- **Multiple 3D Format Support**: OBJ, FBX, STL, PLY, DAE, 3DS, GLTF, GLB, 3MF
- **Interactive Controls**: Manual model rotation with mouse drag, zoom with mouse wheel
- **Automatic Model History**: Persistent storage of loaded models with thumbnails
- **File System Integration**: Save and load models using File System Access API
- **Modern UI**: Clean, responsive interface with drag-and-drop support
- **Advanced Lighting**: Realistic lighting setup with shadows and tone mapping
- **Performance Optimized**: Efficient rendering and memory management

## Technologies Used

### Core Framework
- **React 19.1.1** - Modern UI library with hooks
- **TypeScript 5.9.2** - Type-safe development
- **Vite 7.1.4** - Fast build tool and development server

### 3D Graphics
- **Three.js 0.180.0** - WebGL-based 3D graphics library
- **@react-three/fiber 9.3.0** - React renderer for Three.js
- **@react-three/drei 10.7.4** - Useful helpers for Three.js

### UI Components
- **Material-UI 7.3.2** - React component library
- **@emotion/react & @emotion/styled** - CSS-in-JS styling
- **Styled Components 6.1.19** - Component-level styling
- **SASS 1.92.0** - CSS preprocessor

### Data Storage
- **Dexie 4.2.0** - IndexedDB wrapper for client-side storage
- **File System Access API** - Native file system integration

### Animation & Effects
- **GSAP 3.13.0** - High-performance animation library
- **Plugins**: Flip, ScrollTrigger, Draggable, TextPlugin

## Architecture

The project follows **Feature-Sliced Design (FSD)** architecture principles:

```
src/
├── app/                    # Application layer
├── features/
│   └── model-viewer/       # 3D model viewer feature
│       ├── ui/            # React components
│       ├── lib/           # Business logic services
│       ├── hooks/         # Custom React hooks
│       └── config/        # Configuration files
└── shared/
    ├── config/            # Shared configurations
    │   ├── Three/         # Three.js setup
    │   └── Database/      # Database configuration
    ├── ui/                # Reusable UI components
    └── utils/             # Utility functions
```

## How It Works

### 1. Model Loading System
- **FileValidationService**: Validates file types and sizes
- **ModelLoaderService**: Handles different 3D format loaders
- **SceneService**: Manages Three.js scene, camera, and rendering

### 2. Interactive Controls
- **Manual Rotation**: Mouse drag rotates only the model, keeping camera and lights fixed
- **Zoom Control**: Mouse wheel moves camera closer/farther from the model
- **Auto-centering**: Models are automatically scaled and positioned in the center

### 3. Storage System
- **ModelHistoryService**: Automatic history with IndexedDB storage
- **FileSystemService**: Optional file system integration for persistent storage
- **Thumbnail Generation**: Automatic preview images for loaded models

### 4. Lighting Setup
- **Directional Sun Light**: Primary illumination with shadows (intensity: 4.0)
- **Hemisphere Light**: Natural sky/ground ambient lighting
- **Fill Lights**: Additional lighting for detail visibility
- **Tone Mapping**: ACES Filmic tone mapping for realistic rendering

## Usage

1. **Load a Model**: Drag and drop a 3D file or use the file picker
2. **Interact**: 
   - Drag with mouse to rotate the model
   - Use mouse wheel to zoom in/out
3. **History**: Previously loaded models are automatically saved and can be reloaded
4. **File Management**: Save models to your file system (Chrome/Edge only)

## Supported File Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| OBJ | `.obj` | Wavefront OBJ format |
| FBX | `.fbx` | Autodesk FBX format |
| STL | `.stl` | Stereolithography format |
| PLY | `.ply` | Polygon File Format |
| DAE | `.dae` | COLLADA format |
| 3DS | `.3ds` | 3D Studio format |
| GLTF | `.gltf` | GL Transmission Format |
| GLB | `.glb` | Binary GLTF |
| 3MF | `.3mf` | 3D Manufacturing Format |

## Development

### Prerequisites
- Node.js 18+ 
- Yarn 4.9.4+

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd 3D-viewer

# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build
```

### Available Scripts
- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn lint` - Run ESLint
- `yarn preview` - Preview production build
- `yarn remove-comments` - Remove comments from source files

## Browser Support

- **Chrome/Edge**: Full support including File System Access API
- **Firefox/Safari**: Core functionality (history storage only)
- **Mobile**: Touch-friendly interface with responsive design
