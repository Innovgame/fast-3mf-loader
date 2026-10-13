import { strToU8, zipSync } from "fflate";

const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`;

const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
    <resources>
        <object id="1" type="model">
            <mesh>
                <vertices>
                    <vertex x="0" y="0" z="0" />
                    <vertex x="1" y="0" z="0" />
                    <vertex x="0" y="1" z="0" />
                </vertices>
                <triangles>
                    <triangle v1="0" v2="1" v3="2" />
                </triangles>
            </mesh>
        </object>
        <object id="2" type="model">
            <components>
                <component objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0" />
            </components>
        </object>
    </resources>
    <build>
        <item objectid="2" />
    </build>
</model>`;

export function createSameModelComponentArchive() {
    const zipped = zipSync({
        "_rels/.rels": strToU8(rels),
        "3D/3dmodel.model": strToU8(model),
    });
    return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
}
