import { readFileSync } from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";
import { Box3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const SCALE = 2;
const files = {
  straight: join(root, "public/images/environments/railroad-straight.glb"),
  corner: join(root, "public/images/environments/railroad-corner-small.glb"),
};

const loader = new GLTFLoader();

function measure(path) {
  return new Promise((resolve, reject) => {
    loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

function bboxInfo(scene) {
  const clone = scene.clone(true);
  clone.scale.setScalar(SCALE);
  clone.updateMatrixWorld(true);
  let box = new Box3().setFromObject(clone);
  clone.position.y -= box.min.y;
  clone.updateMatrixWorld(true);
  box = new Box3().setFromObject(clone);
  const size = box.getSize(new Vector3());
  return {
    size: [size.x, size.y, size.z],
    min: [box.min.x, box.min.y, box.min.z],
    max: [box.max.x, box.max.y, box.max.z],
  };
}

for (const [name, path] of Object.entries(files)) {
  const scene = await measure(pathToFileURL(path).href);
  console.log(name, bboxInfo(scene));
}
