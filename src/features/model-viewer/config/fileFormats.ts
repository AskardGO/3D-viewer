export type SupportedFileExtension = 
  | 'obj' | 'fbx' | 'stl' | 'ply' | 'dae' 
  | '3ds' | 'gltf' | 'glb' | '3mf';

export type LoaderType = 'gltf' | 'obj' | 'fbx' | 'stl' | 'ply' | 'collada';

export type FileFormat = {
  extension: SupportedFileExtension;
  mimeType: string;
  loader: LoaderType;
  readAs: 'text' | 'arrayBuffer';
};

export const FILE_FORMATS: Record<SupportedFileExtension, FileFormat> = {
  obj: { extension: 'obj', mimeType: 'text/plain', loader: 'obj', readAs: 'text' },
  fbx: { extension: 'fbx', mimeType: 'application/octet-stream', loader: 'fbx', readAs: 'arrayBuffer' },
  stl: { extension: 'stl', mimeType: 'application/octet-stream', loader: 'stl', readAs: 'arrayBuffer' },
  ply: { extension: 'ply', mimeType: 'application/octet-stream', loader: 'ply', readAs: 'arrayBuffer' },
  dae: { extension: 'dae', mimeType: 'model/vnd.collada+xml', loader: 'collada', readAs: 'text' },
  '3ds': { extension: '3ds', mimeType: 'application/octet-stream', loader: 'obj', readAs: 'arrayBuffer' },
  gltf: { extension: 'gltf', mimeType: 'model/gltf+json', loader: 'gltf', readAs: 'arrayBuffer' },
  glb: { extension: 'glb', mimeType: 'model/gltf-binary', loader: 'gltf', readAs: 'arrayBuffer' },
  '3mf': { extension: '3mf', mimeType: 'model/3mf', loader: 'stl', readAs: 'arrayBuffer' },
};

export const getFileExtension = (filename: string): SupportedFileExtension | null => {
  const ext = filename.toLowerCase().split('.').pop();
  return ext && ext in FILE_FORMATS ? ext as SupportedFileExtension : null;
};

export const getSupportedExtensions = (): string[] => {
  return Object.keys(FILE_FORMATS);
};

export const getAcceptedFileTypes = (): string => {
  return Object.keys(FILE_FORMATS).map(ext => `.${ext}`).join(',');
};

export const getFileFormat = (extension: string): FileFormat | null => {
  const ext = extension.toLowerCase() as SupportedFileExtension;
  return FILE_FORMATS[ext] || null;
};
