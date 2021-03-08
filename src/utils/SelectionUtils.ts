import { Viewport, IModelConnection } from "@bentley/imodeljs-frontend";
import { KeySet, InstanceKey } from "@bentley/presentation-common";
import { Id64Set, Id64String } from "@bentley/bentleyjs-core";


class _ValidSelectionHelper {
    private static lastIModel?: IModelConnection;
    private static lastKeySet?: KeySet;
    private static lastIdSet?: Id64Set;
    private static async _updateData(imodel: IModelConnection): Promise<void> {
        const keySet = new KeySet();
        const ecsql = 'SELECT ECInstanceId, ECClassId FROM BisCore.GeometricElement3d WHERE GeometryStream IS NOT NULL AND InSpatialIndex=true';
        for await (const row of imodel.query(ecsql)) {
            const instanceKey: InstanceKey = {
                id: (row.id as Id64String),
                className: (row.className as string).replace('.', ':'),
            };
            keySet.add(instanceKey);
        }
        this.lastKeySet = keySet;
        this.lastIdSet = keySetToId64Set(keySet);
    }
    public static async _getValidSelectionKeySet(imodel: IModelConnection): Promise<KeySet> {
        if (imodel !== this.lastIModel) {
            await this._updateData(imodel);
        }
        return this.lastKeySet!;
    };
    public static async _getValidSelectionIdSet(imodel: IModelConnection): Promise<Id64Set> {
        if (imodel !== this.lastIModel) {
            await this._updateData(imodel);
        }
        return this.lastIdSet!;
    };
}

export function getValidSelectionKeySet(imodel: IModelConnection): Promise<KeySet> {
    return _ValidSelectionHelper._getValidSelectionKeySet(imodel);
}

export function getValidSelectionIdSet(imodel: IModelConnection): Promise<Id64Set> {
    return _ValidSelectionHelper._getValidSelectionIdSet(imodel);
}



export function filterKeySet(keySet: Readonly<KeySet>, keepFct: (id: Id64String) => boolean): KeySet {
    const filteredKeySet = new KeySet();
    for (const [className, ids] of keySet.instanceKeys) {
        for (const id of ids) {
            if (keepFct(id)) {
                const newKey: InstanceKey = {id: id, className: className};
                filteredKeySet.add(newKey);
            }
        }
    }
    return filteredKeySet;
}

export function filterOutHiddenInstanceKeys(keySet: Readonly<KeySet>, vp: Viewport): KeySet {
    return filterKeySet(keySet, (id: Id64String) => {
        return vp.neverDrawn === undefined || !vp.neverDrawn.has(id);
    });
}

export function keySetToId64Set(keySet: Readonly<KeySet>): Id64Set {
    const idSet: Id64Set = new Set<Id64String>();
    for (const [ids] of keySet.instanceKeys) {
        for (const id of ids) {
            idSet.add(id);
        }
    }
    return idSet;
}
