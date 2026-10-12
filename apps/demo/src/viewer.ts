import { AmbientLight, Box3, Color, DirectionalLight, GridHelper, Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer, type Group } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { disposeModel } from "./model-resources";

export function createViewer(host: HTMLElement) {
    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(new Color("#10151c"), 0);
    renderer.domElement.setAttribute("aria-label", host.getAttribute("aria-label") ?? "3D model preview");
    renderer.domElement.tabIndex = 0;
    host.prepend(renderer.domElement);
    const scene = new Scene();
    const camera = new PerspectiveCamera(40, 1, 0.01, 10000);
    camera.up.set(0, 0, 1);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.listenToKeyEvents(renderer.domElement);
    scene.add(new AmbientLight(0xffffff, 2));
    const key = new DirectionalLight(0xffffff, 3);
    key.position.set(1, -2, 4);
    scene.add(key);
    const fill = new DirectionalLight(0x9cbaff, 1.5);
    fill.position.set(-2, 2, 1);
    scene.add(fill);
    let model: Group | undefined;
    let grid: GridHelper | undefined;
    const center = new Vector3();
    let radius = 1;

    function render() {
        renderer.render(scene, camera);
    }

    function fit() {
        const distance = radius / Math.sin((camera.fov * Math.PI) / 360) / Math.min(camera.aspect, 1);
        camera.near = Math.max(radius / 1000, 0.000001);
        camera.far = distance + radius * 100;
        camera.updateProjectionMatrix();
        camera.position.copy(center).add(new Vector3(1, -1.5, 1).normalize().multiplyScalar(distance * 1.15));
        controls.target.copy(center);
        controls.minDistance = radius * 0.05;
        controls.maxDistance = distance * 10;
        controls.update();
        render();
    }

    const resize = new ResizeObserver(() => {
        const { width, height } = host.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        if (model) fit();
        else render();
    });
    resize.observe(host);
    // Textures load asynchronously after the synchronous builder returns.
    renderer.setAnimationLoop(() => {
        if (!model || document.visibilityState !== "visible" || !host.getClientRects().length) return;
        controls.update();
        render();
    });

    function clear() {
        if (model) {
            scene.remove(model);
            disposeModel(model);
            model = undefined;
        }
        if (grid) {
            scene.remove(grid);
            grid.geometry.dispose();
            if (Array.isArray(grid.material)) grid.material.forEach((material) => material.dispose());
            else grid.material.dispose();
            grid = undefined;
        }
        render();
    }

    return {
        setModel(group: Group) {
            clear();
            model = group;
            scene.add(group);
            const bounds = new Box3().setFromObject(group);
            if (bounds.isEmpty()) {
                center.set(0, 0, 0);
                radius = 1;
            } else {
                bounds.getCenter(center);
                radius = Math.max(bounds.getSize(new Vector3()).length() / 2, 0.000001);
            }
            grid = new GridHelper(radius * 3, 20, 0x486078, 0x283849);
            grid.rotation.x = Math.PI / 2;
            grid.position.set(center.x, center.y, bounds.isEmpty() ? 0 : bounds.min.z - radius * 0.015);
            scene.add(grid);
            fit();
        },
        wireframe(enabled: boolean) {
            model?.traverse((object) => {
                if (!(object instanceof Mesh)) return;
                for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
                    if ("wireframe" in material) material.wireframe = enabled;
                }
            });
        },
        fit,
        clear,
        dispose() {
            renderer.setAnimationLoop(null);
            resize.disconnect();
            controls.dispose();
            clear();
            renderer.dispose();
            renderer.domElement.remove();
        },
    };
}
