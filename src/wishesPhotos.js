// Auto-loads any photo dropped into src/assets/wishes/ (see the README
// there) keyed by lowercase filename, so adding a real photo later needs
// no code changes — just add the file and push.
const modules = import.meta.glob("./assets/wishes/*.{jpg,jpeg,png,webp,avif}", {
  eager: true,
  import: "default",
});

const photosById = {};
for (const path in modules) {
  const id = path.split("/").pop().replace(/\.[^.]+$/, "").toLowerCase();
  photosById[id] = modules[path];
}

export function photoFor(id) {
  return photosById[id] || null;
}
