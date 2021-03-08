
export class MapWithDefault<KeyT, ValueT> extends Map<KeyT, ValueT> {
    get(key: KeyT): ValueT {
        if (!this.has(key))
            return this.default();
        else
            return super.get(key)!;
    }
    private readonly default: () => ValueT;
    constructor(defaultFunction: () => ValueT, entries?: Iterable<readonly [KeyT, ValueT]>) {
        if (entries !== undefined) {
            super(entries);
        } else {
            super();
        }
        this.default = defaultFunction;
    }
}

export function getWithDefault<KeyT, ValueT>(map: Map<KeyT, ValueT>, keyValue: KeyT, defaultValue: ValueT): ValueT {
    if (!map.has(keyValue)) {
        return defaultValue;
    } else {
        return map.get(keyValue)!;
    }
}
