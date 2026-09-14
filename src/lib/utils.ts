import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface FolderTreeNode<T> {
  folder: T;
  children: FolderTreeNode<T>[];
  depth: number;
}

export function buildFolderHierarchy<T extends { id: string; parentId: string | null }>(
  folders: T[]
): FolderTreeNode<T>[] {
  const nodeMap = new Map<string, FolderTreeNode<T>>();
  folders.forEach((f) => {
    nodeMap.set(f.id, { folder: f, children: [], depth: 0 });
  });

  const roots: FolderTreeNode<T>[] = [];
  nodeMap.forEach((node) => {
    if (node.folder.parentId && nodeMap.has(node.folder.parentId)) {
      const parent = nodeMap.get(node.folder.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function flattenFolderHierarchy<T>(nodes: FolderTreeNode<T>[]): FolderTreeNode<T>[] {
  const result: FolderTreeNode<T>[] = [];
  nodes.forEach((n) => {
    result.push(n);
    if (n.children.length > 0) {
      result.push(...flattenFolderHierarchy(n.children));
    }
  });
  return result;
}

export function buildIndentedFolderList<T extends { id: string; name: string; parentId: string | null }>(
  folders: T[]
): { id: string; name: string; depth: number }[] {
  const roots = buildFolderHierarchy(folders);
  const flattened = flattenFolderHierarchy(roots);
  return flattened.map((n) => ({ id: n.folder.id, name: n.folder.name, depth: n.depth }));
}
