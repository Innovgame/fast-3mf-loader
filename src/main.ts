import "./style.css";
import { Fast3MFLoader } from "../lib/main";
// @ts-ignore
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader";
import { fast3mfBuilder } from "../lib/3mf-builder";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <div>
      <label for="profile_3mf">选择要解析的3MF文件</label>
      <input
        type="file"
        id="profile_3mf"
        name="profile_3mf"
        accept=".3mf" />
    </div>
  </div>
`;

function setupInput(input: HTMLInputElement) {
    input.addEventListener("change", async () => {
        const curFiles = input.files;
        if (!curFiles) {
            console.error("curFiles is null.");
            return;
        }

        if (curFiles.length === 0) {
            console.error("No files currently selected for upload");
            return;
        } else {
            const file = curFiles[0];
            const buffer = await file.arrayBuffer();

            console.time("ThreeMFLoader");
            const loader1 = new ThreeMFLoader();
            loader1.parse(buffer);
            console.timeEnd("ThreeMFLoader");

            console.time("Fast3MFLoader");
            const loader = new Fast3MFLoader();
            loader.parse(buffer).then((data) => {
                // @ts-ignore
                const group = fast3mfBuilder(data);
                console.timeEnd("Fast3MFLoader");
            });
        }
    });
}

setupInput(document.querySelector<HTMLInputElement>("#profile_3mf")!);
