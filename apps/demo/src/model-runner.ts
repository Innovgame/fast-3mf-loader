export type ModelSource = { arrayBuffer(): Promise<ArrayBuffer> };

export async function measureModel<Data, Group>(
    source: ModelSource,
    operations: {
        parse(buffer: ArrayBuffer): Promise<Data>;
        build(data: Data): Group;
        now?: () => number;
    },
): Promise<{ group: Group; parse: number; build: number; total: number }> {
    const buffer = await source.arrayBuffer();
    const now = operations.now ?? (() => performance.now());
    const start = now();
    const data = await operations.parse(buffer);
    const parsed = now();
    const group = operations.build(data);
    const built = now();
    return { group, parse: parsed - start, build: built - parsed, total: built - start };
}

export async function measureComparison<Group>(
    source: ModelSource,
    parse: (buffer: ArrayBuffer) => Group,
    now = () => performance.now(),
): Promise<{ group: Group; total: number }> {
    // The fast loader transfers its input. Read a fresh buffer for the baseline.
    const buffer = await source.arrayBuffer();
    const start = now();
    const group = parse(buffer);
    return { group, total: now() - start };
}
