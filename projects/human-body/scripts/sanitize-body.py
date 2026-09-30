"""Bake a modest teaching mannequin from the original normalized body GLB.

Usage: python scripts/sanitize-body.py original-body.glb public/models/human-body.glb
Requires numpy. Input must be the original, unsanitized body-only conversion.
"""
import json
import struct
import sys
from pathlib import Path

import numpy as np

raw = Path(sys.argv[1]).read_bytes()
json_size = struct.unpack_from('<I', raw, 12)[0]
doc = json.loads(raw[20:20 + json_size])
binary_start = 28 + json_size

def read_accessor(index, dtype, width):
    accessor = doc['accessors'][index]
    view = doc['bufferViews'][accessor['bufferView']]
    offset = binary_start + view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    return np.frombuffer(raw, dtype=dtype, count=accessor['count'] * width,
                         offset=offset).reshape(-1, width).copy()

points = read_accessor(0, '<f4', 3).astype(float)
faces = read_accessor(2, '<u4', 1).reshape(-1, 3)
original = points.copy()
x, y, z = original.T

# Broad, smoothly blended neighborhoods remove local sex-characteristic
# surface details without cutting holes or changing the pose/limb alignment.
chest = np.exp(-(((np.abs(x) - .54) / .43) ** 4 + ((y - 2.48) / .5) ** 4))
chest *= np.clip((z - .45) / .3, 0, 1)
pelvis = np.exp(-((x / .52) ** 4 + ((y + .25) / .82) ** 4))
weight = np.maximum(chest, pelvis) * .55
edges = np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]])
edges = np.unique(np.sort(edges, axis=1), axis=0)
edges = np.concatenate([edges, edges[:, ::-1]])
degree = np.bincount(edges[:, 0], minlength=len(points))
for _ in range(100):
    average = np.zeros_like(points)
    np.add.at(average, edges[:, 0], points[edges[:, 1]])
    average /= np.maximum(degree, 1)[:, None]
    points += (average - points) * weight[:, None]

def smoothstep(low, high, values):
    t = np.clip((values - low) / (high - low), 0, 1)
    return t * t * (3 - 2 * t)

# Replace fine chest relief with a broad, featureless pectoral surface.
blend = (smoothstep(1.45, 1.95, y) * (1 - smoothstep(2.8, 3.3, y))
         * (1 - smoothstep(.72, 1.05, np.abs(x))) * smoothstep(.45, .7, z))
chest_surface = 1.0 - .22 * x ** 2 - .16 * (y - 2.3)
points[:, 2] = points[:, 2] * (1 - blend) + chest_surface * blend

normals = np.zeros_like(points)
face_normals = np.cross(points[faces[:, 1]] - points[faces[:, 0]],
                        points[faces[:, 2]] - points[faces[:, 0]])
for corner in range(3):
    np.add.at(normals, faces[:, corner], face_normals)
normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)

# Clip triangles exactly at the waist and hems so the garment has clean edges.
# Both partitions share the same interpolated boundary, avoiding cracks.
vertices = points.tolist()
normal_list = normals.tolist()
skin_faces, shorts_faces = [], []

def clip(polygon, height, keep_above):
    result = []
    for a, b in zip(polygon, polygon[1:] + polygon[:1]):
        pa, pb = np.array(vertices[a]), np.array(vertices[b])
        inside_a = pa[1] >= height if keep_above else pa[1] <= height
        inside_b = pb[1] >= height if keep_above else pb[1] <= height
        if inside_a:
            result.append(a)
        if inside_a != inside_b:
            t = (height - pa[1]) / (pb[1] - pa[1])
            p = pa + t * (pb - pa)
            n = np.array(normal_list[a]) * (1 - t) + np.array(normal_list[b]) * t
            n /= max(np.linalg.norm(n), 1e-12)
            result.append(len(vertices))
            vertices.append(p.tolist())
            normal_list.append(n.tolist())
    return result

def triangulate(polygon, target):
    for i in range(1, len(polygon) - 1):
        target.append([polygon[0], polygon[i], polygon[i + 1]])

for triangle in faces.tolist():
    if np.abs(points[triangle, 0]).mean() > 1.6:
        skin_faces.append(triangle)
        continue
    triangulate(clip(triangle, .78, True), skin_faces)
    triangulate(clip(triangle, -1.38, False), skin_faces)
    middle = clip(clip(triangle, .78, False), -1.38, True)
    triangulate(middle, shorts_faces)
points, normals = np.array(vertices), np.array(normal_list)
all_faces = skin_faces + shorts_faces
arrays = [points.astype('<f4'), normals.astype('<f4'), np.array(all_faces, dtype='<u4'),
          np.array(skin_faces, dtype='<u4'), np.array(shorts_faces, dtype='<u4')]
views, accessors, chunks = [], [], []
offset = 0
for i, array in enumerate(arrays):
    chunk = array.tobytes()
    views.append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(chunk),
                  'target': 34962 if i < 2 else 34963})
    accessor = {'bufferView': i, 'componentType': 5126 if i < 2 else 5125,
                'count': len(array) if i < 2 else array.size,
                'type': 'VEC3' if i < 2 else 'SCALAR'}
    if i == 0:
        accessor.update(min=points.min(axis=0).tolist(), max=points.max(axis=0).tolist())
    accessors.append(accessor)
    chunks.append(chunk)
    offset += len(chunk)

doc.update(
    nodes=[{'mesh': 0, 'name': 'Neutral teaching body'},
           {'mesh': 1, 'name': 'Privacy shorts'}],
    scenes=[{'nodes': [0, 1]}],
    meshes=[{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1}, 'indices': i}]}
            for i in [3, 4]],
    buffers=[{'byteLength': offset}], bufferViews=views, accessors=accessors)
doc['asset']['generator'] = 'MakeHuman teaching mannequin: smoothed privacy regions and shorts'
doc['extras'] = {'privacySanitized': True, 'privacyCoverage': 'chest and pelvis; full rotation'}
json_bytes = json.dumps(doc, separators=(',', ':')).encode()
json_bytes += b' ' * (-len(json_bytes) % 4)
binary = b''.join(chunks)
output = struct.pack('<III', 0x46546c67, 2, 28 + len(json_bytes) + len(binary))
output += struct.pack('<II', len(json_bytes), 0x4e4f534a) + json_bytes
output += struct.pack('<II', len(binary), 0x004e4942) + binary
Path(sys.argv[2]).write_bytes(output)
print(f'Sanitized {np.count_nonzero(weight > .01)} vertices; shorts cover {len(shorts_faces)} triangles')
