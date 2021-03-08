import { DisposeFunc, Id64Set, Id64String } from "@bentley/bentleyjs-core";
import { LowAndHighXYZ } from "@bentley/geometry-core";
import { IModelConnection } from "@bentley/imodeljs-frontend";
import { I18N } from "@bentley/imodeljs-i18n";
import { InstanceKey, KeySet } from "@bentley/presentation-common";
import { ISelectionProvider, Presentation, SelectionChangeEventArgs } from "@bentley/presentation-frontend";
import { UiFramework } from "@bentley/ui-framework";
import { Store } from "redux";
import { connect } from "react-redux";
import { SelectionExtenderComponentProps, SelectionHelperComponent } from "./components/SelectionExtenderComponent";
import { filterKeySet } from "./utils/SelectionUtils";
import { SelectionExtenderState } from "./store/SelectionExtenderState";
import { SelectionExtenderActionType, SelectionExtenderAction } from "./store/SelectionExtenderActions";
import {MatchingRuleType, SelectionExtenderConfig} from "./store/SelectionExtenderTypes";

const TOL = 1e-3;

export class SelectionExtender {

    private static readonly _supportedRules: MatchingRuleType[] = [
        MatchingRuleType.SameClass,
        MatchingRuleType.SameUserLabel,
    ];

    public static get supportedRules(): MatchingRuleType[] {
        return this._supportedRules;
    }

    private static _store: Store<any>;
    private static _stateKey: string;
    private static _handleSelectionChangedDispose?: DisposeFunc;

    public static get stateKey() { return this._stateKey; }

    private static get store() { return this._store; }

    private static get state(): SelectionExtenderState {
        return this.store.getState()[this.stateKey];
    }

    private static forwardMap?: Map<Id64String, string>;
    private static backwardMap?: Map<string, Id64Set>;
    public static set auxDataMap(map: Map<Id64String, any>) {
        this.forwardMap = new Map<Id64String, string>();
        this.backwardMap = new Map<string, Id64Set>();
        for (const [id, auxData] of map) {
            const dataAsString = JSON.stringify(auxData);
            this.forwardMap.set(id, dataAsString);
            if (!this.backwardMap.has(dataAsString)) {
                this.backwardMap.set(dataAsString, new Set<Id64String>([id]));
            } else {
                this.backwardMap.get(dataAsString)!.add(id);
            }

        }
    }

    private static async _getElementBBox(imodel: IModelConnection, key: InstanceKey): Promise<LowAndHighXYZ | undefined> {
        const stmt = `SELECT BBoxLow, BBoxHigh, Origin FROM BisCore.GeometricElement3d WHERE ECInstanceId=${key.id}`;
        for await (const row of imodel.query(stmt)) {
            // return first matching element
            return {
                low: {
                    x: row.bBoxLow.x + row.origin.x,
                    y: row.bBoxLow.y + row.origin.y,
                    z: row.bBoxLow.z + row.origin.z,
                },
                high: {
                    x: row.bBoxHigh.x + row.origin.x,
                    y: row.bBoxHigh.y + row.origin.y,
                    z: row.bBoxHigh.z + row.origin.z,
                },
            }
        }
        return undefined;
    }

    private static async _findSimilarElements(imodel: IModelConnection, singleKey: InstanceKey): Promise<KeySet> {
        const keySet: KeySet = new KeySet();

        // Build ECSql Statement
        const fromClause = `bis.GeometricElement3d c LEFT JOIN bis.ElementAspect ca ON c.ECInstanceId=ca.ECInstanceId WHERE c.ECInstanceId=${singleKey.id} LIMIT 1`;
        const conditions: string[] = ["e.GeometryStream IS NOT NULL"];

        for (const childRule of this.state.config.rule.childRules) {
            if (!childRule.wanted) {
                continue;
            }
            if (!this.state.contentMap.has(childRule.type)) {
                continue;
            }
            switch(childRule.type) {
                case MatchingRuleType.SameClass:
                    conditions.push(`e.ECClassId IN (SELECT c.ECClassId FROM ${fromClause})`);
                    break;
                case MatchingRuleType.SameCategory:
                    conditions.push(`e.Category.id IN (SELECT c.Category.id FROM ${fromClause})`);
                    break;
                case MatchingRuleType.SameUserLabel:
                    conditions.push(`e.UserLabel IN (SELECT c.UserLabel FROM ${fromClause})`);
                    break;
                case MatchingRuleType.SameElementAspect:
                    conditions.push(`ea.ECClassId IN (SELECT ca.ECClassId FROM ${fromClause})`);
                    break;
                case MatchingRuleType.SameModel:
                    conditions.push(`e.Model.id IN (SELECT c.Model.id FROM ${fromClause})`);
                    break;
                case MatchingRuleType.SameParent:
                    conditions.push(`e.Parent.id IN (SELECT c.Parent.id FROM ${fromClause})`);
                    break;
                case MatchingRuleType.SameGeometry:
                    conditions.push(`e.GeometryStream IN (SELECT c.GeometryStream FROM ${fromClause})`);
                    break;
                case MatchingRuleType.SameGeometrySize:
                    conditions.push(`LENGTH(e.GeometryStream) IN (SELECT LENGTH(c.GeometryStream) FROM ${fromClause})`);
                    break;
                case MatchingRuleType.SameBBoxHeight:
                    conditions.push(
                        `e.BBoxHigh.Z-e.BBoxLow.Z >= (SELECT MIN(c.BBoxHigh.Z-c.BBoxLow.Z)*(1.0-${TOL}) FROM ${fromClause}) AND ` +
                        `e.BBoxHigh.Z-e.BBoxLow.Z <= (SELECT MAX(c.BBoxHigh.Z-c.BBoxLow.Z)*(1.0+${TOL}) FROM ${fromClause})`
                    );
                    break;
                case MatchingRuleType.SameBBoxVolume:
                    conditions.push(
                        "(e.BBoxHigh.X-e.BBoxLow.X)*(e.BBoxHigh.Y-e.BBoxLow.Y)*(e.BBoxHigh.Z-e.BBoxLow.Z)" +
                        ` >= (SELECT MIN((c.BBoxHigh.X-c.BBoxLow.X)*(c.BBoxHigh.Y-c.BBoxLow.Y)*(c.BBoxHigh.Z-c.BBoxLow.Z))*(1.0-${TOL}) FROM ${fromClause}) AND ` +
                        "(e.BBoxHigh.X-e.BBoxLow.X)*(e.BBoxHigh.Y-e.BBoxLow.Y)*(e.BBoxHigh.Z-e.BBoxLow.Z)" +
                        ` <= (SELECT MAX((c.BBoxHigh.X-c.BBoxLow.X)*(c.BBoxHigh.Y-c.BBoxLow.Y)*(c.BBoxHigh.Z-c.BBoxLow.Z))*(1.0+${TOL}) FROM ${fromClause})`
                    );
                    break;
                default:
                    throw new Error(`MatchingRuleType handling not implement: ${childRule.type}`);
            }
        }
        const extraConditions = conditions.length > 0 ?
            conditions.join(` ${this.state.config.rule.operator} `)
            : undefined;

        let stmt = "SELECT e.ECInstanceId, e.ECClassId, e.BBoxLow, e.BBoxHigh, e.Origin FROM bis.GeometricElement3d e LEFT JOIN bis.ElementAspect ea ON e.ECInstanceId=ea.ECInstanceId"
        if (this.state.config.maxDistEnabled) {
            const maxDist = this.state.config.maxDistValue!;
            const bbox = await this._getElementBBox(imodel, singleKey);
            if (bbox === undefined) {
                return keySet;
            }
            stmt += " JOIN bis.SpatialIndex i ON e.ECInstanceId=i.ECInstanceId" +
                ` WHERE i.MinX<=${bbox.high.x + maxDist} AND i.MinY<=${bbox.high.y + maxDist} AND i.MinZ<=${bbox.high.z + maxDist}` +
                ` AND i.MaxX>=${bbox.low.x - maxDist} AND i.MaxY>=${bbox.low.y - maxDist} AND i.MaxZ>=${bbox.low.z - maxDist}`;
            if (extraConditions !== undefined){
                stmt += ` AND ${extraConditions}`;
            }
        } else {
            if (extraConditions !== undefined){
                stmt += ` WHERE ${extraConditions}`;
            }
        }
        if (this.state.config.maxCountEnabled) {
            stmt += ` ORDER BY RANDOM() LIMIT ${this.state.config.maxCountValue}`
        }
        stmt += ";";

        // Query with statement
        for await (const row of imodel.query(stmt)) {
            const className = row.className.replace('.', ':');
            const instanceKey: InstanceKey = {
                id: row.id,
                className: className,
            }
            keySet.add(instanceKey);
        }

        // Optional filtering by auxData
        let filteredKeySet = keySet
        if (this.state.config.enableAuxData && this.forwardMap !== undefined && this.backwardMap !== undefined) {
            const auxData = this.forwardMap.get(singleKey.id);
            if (auxData !== undefined) {
                const equalSet = this.backwardMap.get(auxData);
                if (equalSet !== undefined) {
                    filteredKeySet = filterKeySet(keySet, (id: Id64String) => {
                        return equalSet.has(id);
                    });
                }
            }
        }


        return filteredKeySet;
    }

    public static extendSelection(): void {
        const imodel = UiFramework.getIModelConnection();
        const singleKey = this.state.singleKey;
        if (imodel !== undefined && singleKey !== undefined) {

            SelectionExtender.store.dispatch({
                type: SelectionExtenderActionType.SEARCH_HAS_STARTED,
            });

            this._findSimilarElements(imodel, singleKey).then((keySet: KeySet) => {

                Presentation.selection.replaceSelection("", imodel, keySet);

                SelectionExtender.store.dispatch({
                    type: SelectionExtenderActionType.ELEMENTS_WERE_FOUND,
                    newFoundCount: keySet.size,
                });
            });
        }
    }

    public static resetSelection(): void {
        const singleKey = this.state.singleKey;
        const imodel = UiFramework.getIModelConnection();
        if (singleKey !== undefined && imodel !== undefined) {
            Presentation.selection.replaceSelection("", imodel, [singleKey]);
            SelectionExtender.store.dispatch({
                type: SelectionExtenderActionType.ELEMENTS_WERE_FOUND,
                newFoundCount: undefined,
            });
        }
    }

    public static setConfig(newConfig: SelectionExtenderConfig): void {
        SelectionExtender.store.dispatch({
            type: SelectionExtenderActionType.CONFIG_WAS_CHANGED,
            newConfig: newConfig,
        });
    }


    private static async _createContentMap(imodel: IModelConnection, id: Id64String): Promise<Map<MatchingRuleType, string[]>> {
        const map = new Map<MatchingRuleType, string[]>();

        const stmt = "SELECT ea.ECClassId as ElementAspectId, c.UserLabel as CategoryLabel, c.Description as CategoryDescription, c.CodeValue as CategoryCodeValue, "
            +"e.UserLabel, e.Parent.id as ParentId, e.Model.id as ModelId, e.BBoxHigh.z-e.BBoxLow.z as BBoxHeight, LENGTH(e.GeometryStream) as GeometrySize, e.ECClassId, e.CodeValue, e.TypeDefinition, "
            +"(e.BBoxHigh.X-e.BBoxLow.X)*(e.BBoxHigh.Y-e.BBoxLow.Y)*(e.BBoxHigh.Z-e.BBoxLow.Z) as BBoxVolume "
            +`FROM bis.GeometricElement3d e LEFT JOIN bis.Category c ON e.Category.id=c.ECInstanceId LEFT JOIN bis.ElementAspect ea ON e.ECInstanceId=ea.ECInstanceId WHERE e.ECInstanceId=${id} LIMIT 1`;

        console.log(stmt);


        const row = (await imodel.query(stmt).next()).value;

        const categoryStrings: string[] = [];
        if (row.categoryLabel !== undefined && row.categoryLabel !== "") {
            categoryStrings.push(row.categoryLabel);
        }
        if (row.categoryCodeValue !== undefined && row.categoryCodeValue !== "") {
            categoryStrings.push(row.categoryCodeValue);
        }
        if (row.categoryDescription !== undefined && row.categoryDescription !== "") {
            categoryStrings.push(row.categoryDescription);
        }
        if (categoryStrings.length !== 0) {
            map.set(MatchingRuleType.SameCategory, categoryStrings);
        }
        if (row.modelId !== undefined) {
            map.set(MatchingRuleType.SameModel, [""]);
        }
        if (row.parentId !== undefined) {
            map.set(MatchingRuleType.SameParent, [row.parentId]);
        }
        if (row.elementAspectId !== undefined) {
            map.set(MatchingRuleType.SameElementAspect, [""]);
        }
        if (row.userLabel !== undefined && row.userLabel !== "") {
            map.set(MatchingRuleType.SameUserLabel, [row.userLabel]);
        }
        if (row.className !== undefined && row.userLabel !== "") {
            map.set(MatchingRuleType.SameClass, [row.className]);
        }
        if (row.codeValue !== undefined && row.codeValue !== "") {
            map.set(MatchingRuleType.SameCodeValue, [row.codeValue]);
        }
        if (row.geometrySize !== undefined && row.geometrySize !== 0) {
            map.set(MatchingRuleType.SameGeometrySize, [row.geometrySize.toString()]);
            map.set(MatchingRuleType.SameGeometry, [""]);
        }
        if (row.bBoxHeight !== undefined && row.bBoxHeight !== 0) {
            map.set(MatchingRuleType.SameBBoxHeight, [(row.bBoxHeight as number).toPrecision(6)]);
        }
        if (row.bBoxVolume !== undefined && row.bBoxVolume !== 0) {
            map.set(MatchingRuleType.SameBBoxVolume, [(row.bBoxVolume as number).toPrecision(6)]);
        }
        // TypeDefinition

        return map;
    }

    private static _handleSelectionChanged = async (
        evt: SelectionChangeEventArgs,
        selectionProvider: ISelectionProvider
    ): Promise<void> => {
        // Get the selection as a set of ids
        const selection = selectionProvider.getSelection(evt.imodel, evt.level);

        let singleKey: InstanceKey | undefined = undefined;
        if (!selection.isEmpty && selection.instanceKeys.size === 1) {
            for (const [className, idSet] of selection.instanceKeys) {
                if (idSet.size === 1) {
                    singleKey = {
                        className: className,
                        id: idSet.values().next().value,
                    };
                }
                break;
            }
        }
        if (singleKey !== undefined) {

            const imodel = UiFramework.getIModelConnection()!;
            const contentMap = await SelectionExtender._createContentMap(imodel, singleKey.id);

            SelectionExtender.store.dispatch<SelectionExtenderAction>({
                type: SelectionExtenderActionType.SINGLE_KEY_HAS_CHANGED,
                newSingleKey: singleKey,
                newContentMap: contentMap,
            });
        }
    }

    // TODO: bring back i18n argument and return legitimate promise
    public static async initialize(store: Store<any>, i18n: I18N, stateKey: string): Promise<void> {
        console.log("Inside SelectionExtender2 initialize()");

        this._store = store;
        this._stateKey = stateKey;

        // subscribe for unified selection changes
        console.log("Registering selectionChangedHandler");
        this._handleSelectionChangedDispose = Presentation.selection.selectionChange.addListener(this._handleSelectionChanged);
        console.log("Registration of selectionChangedHandler complete");

        return i18n.registerNamespace("SelectionExtender").readFinished;
    }

    public static uninitialize(): void {
        if (this._handleSelectionChangedDispose !== undefined) {
            this._handleSelectionChangedDispose();
            this._handleSelectionChangedDispose = undefined;
        }
    }

}


function mapStateToProps(rootState: any): SelectionExtenderComponentProps | undefined {
    // debugger;
    const state = rootState[SelectionExtender.stateKey] as SelectionExtenderState | undefined;
    if (!state) {
        return undefined;
    }
    return {
        singleId: state.singleKey?.id,
        contentMap: state.contentMap,
        isSearching: state.isSearching,
        foundCount: state.foundCount,
        config: state.config,
        onConfigChanged: (newConfig: SelectionExtenderConfig) => {SelectionExtender.setConfig(newConfig); },
        onExtendClicked: () => {SelectionExtender.extendSelection(); },
        onResetClicked: () => {SelectionExtender.resetSelection(); },
    };
}


export const ConnectedSelectionHelperComponent = connect(mapStateToProps)(SelectionHelperComponent);




