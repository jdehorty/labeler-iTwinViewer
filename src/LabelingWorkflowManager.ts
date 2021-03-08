import {Id64Arg, Id64String} from "@bentley/bentleyjs-core";
import { ColorDef, Frustum } from "@bentley/imodeljs-common";
import { IModelApp, IModelConnection, MarginPercent, ScreenViewport, SpatialModelState, ViewChangeOptions, ZoomToOptions } from "@bentley/imodeljs-frontend";
import { I18N } from "@bentley/imodeljs-i18n";
import { KeySet } from "@bentley/presentation-common";
import { ISelectionProvider, Presentation, SelectionChangeEventArgs } from "@bentley/presentation-frontend";
import { Store } from "redux";
import { MachineLearningColorMode, MachineLearningLabel, MachineLearningLabelInterface } from "./data/LabelTypes";
import { getWithDefault } from "./utils/MapWithDefault";
import { keySetToId64Set } from "./utils/SelectionUtils";
import { LabelingWorkflowManagerAction, LabelingWorkflowManagerActionType } from "./store/LabelingWorkflowActions";
import { LabelingWorflowOverrideElements } from "./LabelingWorkflowOverrideElements";
import { LabelingWorkflowManagerSelectors } from "./store/LabelingWorkflowSelectors";
import { ECClassState, ElementState, LabelingWorkflowState, ModelState, CategoryState, PredLabelState, TrueLabelState, CommonLabelState } from "./store/LabelingWorkflowState";


const ZOOM_OPTIONS: ViewChangeOptions & ZoomToOptions = {
    animateFrustumChange: true,
    animationTime: 125,
    noSaveInUndo: true,
    marginPercent: new MarginPercent(0.2, 0.2, 0.2, 0.2),
};


/** This class manages element selection, visiblity, color mode, labeling and other parts of the ML labeling workflow */
export class LabelingWorkflowManager {

    /** Redux store reference */
    private static _store: Store<any>;

    /** State key inside global state */
    public static stateKey: string;

    /** Store accessor */
    private static get store() { return this._store; }

    /** State accessor */
    private static get state(): LabelingWorkflowState { return this.store.getState()[this.stateKey]; }

    /**
     * Initialization function, to be called during app startup.
     */

    // TODO: bring back i18n argument and return legitimate promise
    public static async initialize(store: Store<any>, i18n: I18N, stateKey: string): Promise<void> {
        this._store = store;
        this.stateKey = stateKey;
        this._store.subscribe(this.handleStateChange.bind(this));
        return i18n.registerNamespace("LabelingWorkflowManager").readFinished;
    }

    private static _labelInterface?: MachineLearningLabelInterface;
    private static _imodel?: IModelConnection;

    public static configureDataSources(
        labelInterface: MachineLearningLabelInterface,
        imodel: IModelConnection,
    ): void {
        this._labelInterface = labelInterface;
        this._imodel = imodel;
    }

    private static ECSQL_BASE = 'BisCore.GeometricElement3d WHERE GeometryStream IS NOT NULL';

    /**
     * Fills element state map using ECSQL results
     * Excludes machine learning storage which must be added later to the map entries.
     * @internal
     */
    private static async _fillElementStateMap(
        // IModel connection
        imodel: IModelConnection,
        // State map to be filled
        elementStateMap: Map<Id64String, ElementState>
    ): Promise<void> {
        const ecsql = 'SELECT ECInstanceId as elementId, ECClassId, ECClassId as classId, Category.Id as categoryId, Model.Id as modelId FROM ' + this.ECSQL_BASE + ';';
        for await (const row of imodel.query(ecsql)) {
            if (row.elementId === undefined || row.modelId === undefined || row.categoryId === undefined || row.classId === undefined) {
                continue;
            }
            elementStateMap.set(row.elementId, row as ElementState);
        }
    }

    /**
     * Fills model state map using "models.queryProps" results.
     * The element counts for each model must be computed later for each entry
     * @internal
     */
    private static async _fillModelStateMap(
        /** IModel connection */
        imodel: IModelConnection,
        /** State map to be filled */
        modelStateMap: Map<Id64String, ModelState>
    ): Promise<void> {
        const modelPropArray = await imodel.models.queryProps({
            from: SpatialModelState.classFullName,
            where: 'ECInstanceId IN (SELECT DISTINCT Model.Id FROM ' + this.ECSQL_BASE + ')',
            wantPrivate: false,
        })
        for (const row of modelPropArray) {
            if (row.id === undefined) {
                continue;
            }
            modelStateMap.set(row.id, {
                instanceId: row.id,
                displayLabel: row.name,
                isDisplayed: true,
                isTransparent: false,
            });
        }
    }

    /**
     * Fills category state map using ECSQL results.
     * The element counts for each category must be computed later for each entry.
     * @internal
     */
    private static async _fillCategoryStateMap(
        /** IModel connection */
        imodel: IModelConnection,
        /** State map to be filled */
        categoryStateMap: Map<Id64String, CategoryState>
    ): Promise<void> {

        const ecsql =
            'SELECT ECInstanceId as categoryId, UserLabel as categoryLabel, CodeValue as categoryCode ' +
            'FROM BisCore.SpatialCategory ' +
            'WHERE ECInstanceId IN (SELECT DISTINCT Category.Id FROM ' + this.ECSQL_BASE + ');'
        for await (const row of imodel.query(ecsql)) {
            if (row.categoryId === undefined) {
                continue;
            }
            let description = "";
            if (row.categoryLabel) {
                description += row.categoryLabel;
            }
            if (row.categoryCode) {
                if (description) {
                    description += " | ";
                }
                description += row.categoryCode;
            }
            categoryStateMap.set(row.categoryId, {
                instanceId: row.categoryId,
                displayLabel: description,
                isDisplayed: true,
                isTransparent: false,
            });
        }
    }

    /**
     * Fills ecclass state map using ECSQL results.
     * The element counts for each ecclass must be computed later for each entry.
     * @internal
     */
    private static async _fillClassStateMap(
        /** IModel connection */
        imodel: IModelConnection,
        /** State map to be filled */
        classStateMap: Map<Id64String, ECClassState>,
    ): Promise<void> {
        const ecsql = 'SELECT DISTINCT ECClassId as classId, ECClassId FROM ' + this.ECSQL_BASE + ';'
        for await (const row of imodel.query(ecsql)) {
            if (row.classId === undefined || row.className === undefined) {
                continue;
            }
            classStateMap.set(row.classId, {
                instanceId: row.classId,
                displayLabel: row.className,
                isDisplayed: true,
                isTransparent: false,
                classKey: row.className.replace('.', ':'),
            });
        }
    }

    private static DEFAULT_COLOR = ColorDef.from(255, 255, 255);

    /**
     * Initializes machine learning state maps.
     * The element counts must be added later.
     * @internal
     */
    private static async _fillMLStateMaps(
        /** Machine learning labeling interface */
        labelInterface: MachineLearningLabelInterface,
        /** Predicted label state map */
        predLabelStateMap: Map<MachineLearningLabel, PredLabelState>,
        /** True label state map */
        trueLabelStateMap: Map<MachineLearningLabel, TrueLabelState>,
        /** Common label state map */
        commonLabelStateMap: Map<MachineLearningLabel, CommonLabelState>,
    ): Promise<void> {

        const labelDefs = await labelInterface.getLabelDefinitions();
        for (const [name, labelDef] of labelDefs.labelDefMap) {
            predLabelStateMap.set(name, {
                label: name,
                displayI18nKey: name,
                isDisplayed: labelDef.modelPredictionShown ? labelDef.modelPredictionShown : true,
                isTransparent: false,
            });
            trueLabelStateMap.set(name, {
                label: name,
                displayI18nKey: name,
                isDisplayed: labelDef.userLabelShown ? labelDef.userLabelShown : true,
                isTransparent: false,
            });

            const hasParent = labelDef.parentLabel !== undefined && (labelDef.parentLabel !== name);
            const parent = hasParent ? labelDef.parentLabel : undefined;

            commonLabelStateMap.set(name, {
                label: name,
                parentLabel: parent,
                childrenLabels: [],
                color: labelDef.defaultColor ? labelDef.defaultColor : this.DEFAULT_COLOR,
                isExpanded: false,
            });
        }

        // Compute children array
        for (const [childName, labelState] of commonLabelStateMap) {
            if (labelState.parentLabel !== undefined && commonLabelStateMap.has(labelState.parentLabel)) {
                commonLabelStateMap.get(labelState.parentLabel)!.childrenLabels.push(childName);
            }
        }

    }


    /**
     * Patches element state map with machine learning labels and predictions
     */
    private static async _fillMLData(
        /** Machine learning labeling interface */
        labelInterface: MachineLearningLabelInterface,
        /** State map to be patched with ML labels and predictions */
        elementStateMap: Map<Id64String, ElementState>
    ): Promise<void> {

        const idArray = Array.from(elementStateMap.keys());
        const labelDefs = await labelInterface.getLabelDefinitions();
        const userLabelMap = await labelInterface.getUserLabels(idArray);
        const modelPredictionMap = await labelInterface.getModelPredictions(idArray);

        for (const [elementId, elementState] of elementStateMap) {
            elementState.trueLabel = getWithDefault(userLabelMap, elementId, labelDefs.unlabeledValue);
            const predictionData = getWithDefault(modelPredictionMap, elementId, {label: labelDefs.unlabeledValue});
            elementState.predLabel = predictionData.label;
            elementState.auxData = predictionData.auxData;
        }
    }

    public static get auxDataMap(): Map<Id64String, any> {
        const map = new Map<Id64String, any>();
        const elementStateMap = LabelingWorkflowManagerSelectors.elementStateMap(this.state);
        for (const [id, data] of elementStateMap) {
            if (data.auxData !== undefined) {
                map.set(id, data.auxData);
            }
        }
        return map;
    }

    public static async initializeData(): Promise<void> {

        if (this._imodel === undefined || this._labelInterface === undefined) {
            throw new Error();
        }

        const elementStateMap = new Map<Id64String, ElementState>();

        const modelStateMap = new Map<Id64String, ModelState>();
        const categoryStateMap = new Map<Id64String, CategoryState>();
        const classStateMap = new Map<Id64String, ECClassState>();
        const predLabelStateMap = new Map<MachineLearningLabel, PredLabelState>();
        const trueLabelStateMap = new Map<MachineLearningLabel, TrueLabelState>();
        const commonLabelStateMap = new Map<MachineLearningLabel, CommonLabelState>();

        await Promise.all([
            this._fillElementStateMap(this._imodel, elementStateMap),
            this._fillModelStateMap(this._imodel, modelStateMap),
            this._fillCategoryStateMap(this._imodel, categoryStateMap),
            this._fillClassStateMap(this._imodel, classStateMap),
            this._fillMLStateMaps(
                this._labelInterface,
                predLabelStateMap,
                trueLabelStateMap,
                commonLabelStateMap,
            ),
        ]);

        await this._fillMLData(this._labelInterface, elementStateMap);

        this.store.subscribe(this.handleStateChange.bind(this));

        this.store.dispatch<LabelingWorkflowManagerAction>({
            type: LabelingWorkflowManagerActionType.DataWasInitialized,
            elementStateMap: elementStateMap,
            modelStateMap: modelStateMap,
            categoryStateMap: categoryStateMap,
            classStateMap: classStateMap,
            predLabelStateMap: predLabelStateMap,
            trueLabelStateMap: trueLabelStateMap,
            commonLabelStateMap: commonLabelStateMap,
        });

        Presentation.selection.selectionChange.addListener((args: SelectionChangeEventArgs, provider: ISelectionProvider) => {
            this.handleSelection(provider.getSelection(args.imodel, args.level));
        });
        this.handleSelection(Presentation.selection.getSelection(this._imodel));

    }


    private static handleStateChange(): void {
        IModelApp.viewManager.forEachViewport((vp: ScreenViewport) => {
            const ovr = LabelingWorflowOverrideElements.getOrCreate(vp);
            ovr.setElementData(LabelingWorkflowManagerSelectors.elementOverrideData(this.state));
            vp.setFeatureOverrideProviderChanged();
        });
    }


    private static handleSelection(keySet: Readonly<KeySet>): void {

        const elementSet = keySetToId64Set(keySet);

        this.store.dispatch<LabelingWorkflowManagerAction>({
            type: LabelingWorkflowManagerActionType.SelectionHasChanged,
            elementSet: elementSet,
        });

    }

    /** Select all elements that belong to a specific model (or all models) */
    public static selectModel(modelId?: Id64String): void {
        if (this._imodel === undefined) {
            throw new Error();
        }
        const keySet = new KeySet();
        const elementStateMap = LabelingWorkflowManagerSelectors.elementStateMap(this.state);
        const selectableSet = LabelingWorkflowManagerSelectors.selectableSet(this.state);
        for (const [elementId, elementState] of elementStateMap) {
            if ((modelId === undefined || elementState.modelId === modelId) && selectableSet.has(elementId)) {
                keySet.add({
                    id: elementId,
                    className: elementState.className.replace('.', ':'),
                });
            }
        }
        Presentation.selection.replaceSelection("", this._imodel, keySet);
    }

    /** Select all elements that belong to a specific category (or all categories) */
    public static selectCategory(categoryId?: Id64String): void {
        if (this._imodel === undefined) {
            throw new Error();
        }
        const keySet = new KeySet();
        const elementStateMap = LabelingWorkflowManagerSelectors.elementStateMap(this.state);
        const selectableSet = LabelingWorkflowManagerSelectors.selectableSet(this.state);
        for (const [elementId, elementState] of elementStateMap) {
            if ((categoryId === undefined || elementState.categoryId === categoryId) && selectableSet.has(elementId)) {
                keySet.add({
                    id: elementId,
                    className: elementState.className.replace('.', ':'),
                });
            }
        }
        Presentation.selection.replaceSelection("", this._imodel, keySet);
    }

    /** Select all elements that belong to a specific ecclass (or all ecclasses) */
    public static selectClass(classId?: Id64String): void {
        if (this._imodel === undefined) {
            throw new Error();
        }
        const keySet = new KeySet();
        const elementStateMap = LabelingWorkflowManagerSelectors.elementStateMap(this.state);
        const selectableSet = LabelingWorkflowManagerSelectors.selectableSet(this.state);
        for (const [elementId, elementState] of elementStateMap) {
            if ((classId === undefined || elementState.classId === classId) && selectableSet.has(elementId)) {
                keySet.add({
                    id: elementId,
                    className: elementState.className.replace('.', ':'),
                });
            }
        }
        Presentation.selection.replaceSelection("", this._imodel, keySet);
    }

    /** Select all elements that have a specific machine learning label (or all) */
    public static selectLabel(label?: Id64String): void {
        if (this._imodel === undefined) {
            throw new Error();
        }
        const keySet = new KeySet();
        const elementStateMap = LabelingWorkflowManagerSelectors.elementStateMap(this.state);
        const selectableSet = LabelingWorkflowManagerSelectors.selectableSet(this.state);

        if (label === undefined) {
            this._constructKeySetFromSelected(elementStateMap, selectableSet, keySet);
        } else {

            const commonLabelStateMap = this.state.commonLabelStateMap;
            const acceptableLabelSet = new Set<MachineLearningLabel>();

            // Recursive selection
            this._doRecursiveSelection(acceptableLabelSet, commonLabelStateMap, label);

            for (const [elementId, elementState] of elementStateMap) {
                if (acceptableLabelSet.has(elementState.trueLabel) && selectableSet.has(elementId)) {
                    keySet.add({
                        id: elementId,
                        className: elementState.className.replace('.', ':'),
                    });
                }
            }
        }
        Presentation.selection.replaceSelection("", this._imodel, keySet);
    }


    /** Select all elements that have a specific machine learning prediction (or all) */
    public static selectPrediction(prediction?: Id64String): void {
        if (this._imodel === undefined) {
            throw new Error();
        }
        const keySet = new KeySet();
        const elementStateMap = LabelingWorkflowManagerSelectors.elementStateMap(this.state);
        const selectableSet = LabelingWorkflowManagerSelectors.selectableSet(this.state);

        if (prediction === undefined) {
            this._constructKeySetFromSelected(elementStateMap, selectableSet, keySet);
        } else {

            const commonLabelStateMap = this.state.commonLabelStateMap;
            const acceptableLabelSet = new Set<MachineLearningLabel>();

            // Recursive selection
            this._doRecursiveSelection(acceptableLabelSet, commonLabelStateMap, prediction);

            for (const [elementId, elementState] of elementStateMap) {
                if (acceptableLabelSet.has(elementState.predLabel) && selectableSet.has(elementId)) {
                    keySet.add({
                        id: elementId,
                        className: elementState.className.replace('.', ':'),
                    });
                }
            }
        }
        Presentation.selection.replaceSelection("", this._imodel, keySet);
    }

    /**
     * Executes a recursive selection; creates a function object and then invokes on a label or prediction.
     * @param acceptableLabelSet -  set of ML Labels derived from a blob file
     * @param commonLabelStateMap -  map of ML Labels derived from a blob file
     * @param labelOrPrediction
     * @private
     */
    private static _doRecursiveSelection(acceptableLabelSet: Set<MachineLearningLabel>, commonLabelStateMap: Map<MachineLearningLabel, CommonLabelState>, labelOrPrediction: string) {
        const _recursiveSelect = this._recursiveSelect(acceptableLabelSet, commonLabelStateMap);
        _recursiveSelect(labelOrPrediction);
    }

    /**
     * Constructs a key set from element selection.
     * @param elementStateMap - Map of Geometric element states
     * @param selectableSet - Set of element keys for a selection
     * @param keySet - Container for holding multiple keys
     * @private
     */
    private static _constructKeySetFromSelected(elementStateMap: Map<Id64String, ElementState>, selectableSet: Set<Id64String>, keySet: KeySet) {
        for (const [elementId, elementState] of elementStateMap) {
            if (selectableSet.has(elementId)) {
                keySet.add({
                    id: elementId,
                    className: elementState.className.replace('.', ':'),
                });
            }
        }
    }

    /**
     * Recursively selects all indicated elements.
     * @param acceptableLabelSet - Set of labels derived from a blob file
     * @param commonLabelStateMap - Map of ML Labels derived from a blob file
     * @private
     */
    private static _recursiveSelect(acceptableLabelSet: Set<MachineLearningLabel>, commonLabelStateMap: Map<MachineLearningLabel, CommonLabelState>) {
        const _recurse = (name: MachineLearningLabel) => {
            acceptableLabelSet.add(name);
            if (commonLabelStateMap.get(name)!.isExpanded === false) {
                for (const child of commonLabelStateMap.get(name)!.childrenLabels) {
                    _recurse(child);
                }
            }
        };
        return _recurse;
    }

    /** Set Force Show all */
    public static setForceShowAll = (forceShowAll: boolean): void => {
        LabelingWorkflowManager.store.dispatch<LabelingWorkflowManagerAction>({
            type: LabelingWorkflowManagerActionType.ForceShowAllChanged,
            newForceShowAll: forceShowAll,
        });
    }

    /** Enable cycle mode */
    public static cycleElementsEnable = (): void => {
        let selectableList: Id64Arg = Array.from(LabelingWorkflowManagerSelectors.selectableSet(LabelingWorkflowManager.state));
        const selectionSet = LabelingWorkflowManager.state.selectionSet;
        selectableList = selectableList.filter((id: Id64String) => selectionSet.has(id));
        if (selectableList.length === 0 || LabelingWorkflowManager.state.cycleModeState.enabled !== false) {
            return;
        }

        LabelingWorkflowManager.store.dispatch<LabelingWorkflowManagerAction>({
            type: LabelingWorkflowManagerActionType.CycleModeActionStarted,
        });

        const initialFrustums = new Map<ScreenViewport, Frustum>();
        IModelApp.viewManager.forEachViewport((vp: ScreenViewport) => {
            initialFrustums.set(vp, vp.getFrustum());
            vp.zoomToElements(selectableList, ZOOM_OPTIONS);
        });

        LabelingWorkflowManager.store.dispatch<LabelingWorkflowManagerAction>({
            type: LabelingWorkflowManagerActionType.CycleModeWasEnabled,
            cycleList: selectableList,
            initialFrustums: initialFrustums,
        });
    };

    /** Disable cycle mode */
    public static cycleElementsDisable = (): void => {
        if (LabelingWorkflowManager.state.cycleModeState.enabled !== true) {
            return;
        }

        LabelingWorkflowManager.store.dispatch<LabelingWorkflowManagerAction>({
            type: LabelingWorkflowManagerActionType.CycleModeActionStarted,
        });

        IModelApp.viewManager.forEachViewport((vp: ScreenViewport) => {
            const frustum = LabelingWorkflowManager.state.cycleModeState.initialFrustums!.get(vp);
            if (frustum !== undefined) {
                vp.setupViewFromFrustum(frustum);
            }
        });

        LabelingWorkflowManager.store.dispatch<LabelingWorkflowManagerAction>({
            type: LabelingWorkflowManagerActionType.CycleModeWasDisabled
        });
    };

    /** Pop out window */
    public static popOutWindow = () => {

    }

    /** Cycle mode forward */
    public static cycleElementsForward = (count: number): void => {
        if (LabelingWorkflowManager.state.cycleModeState.enabled !== true) {
            return;
        }

        LabelingWorkflowManager.store.dispatch<LabelingWorkflowManagerAction>({
            type: LabelingWorkflowManagerActionType.CycleModeActionStarted,
        });

        const total = LabelingWorkflowManager.state.cycleModeState.cycleList!.length;
        let index = LabelingWorkflowManager.state.cycleModeState.currentIndex;
        if (index === undefined) {
            index = 0;
        } else {
            index += count;
            while (index >= total) {
                index -= total;
            }
        }

        IModelApp.viewManager.forEachViewport((vp: ScreenViewport) => {
            vp.zoomToElements(LabelingWorkflowManager.state.cycleModeState.cycleList![index!], ZOOM_OPTIONS);
        });

        LabelingWorkflowManager.store.dispatch<LabelingWorkflowManagerAction>({
            type: LabelingWorkflowManagerActionType.CycleModeIndexWasChanged,
            newIndex: index,
        });
    };

    /** Cycle mode backward */
    public static cycleElementsBackward = (count: number): void => {
        if (LabelingWorkflowManager.state.cycleModeState.enabled !== true) {
            return;
        }

        LabelingWorkflowManager.store.dispatch<LabelingWorkflowManagerAction>({
            type: LabelingWorkflowManagerActionType.CycleModeActionStarted,
        });

        const total = LabelingWorkflowManager.state.cycleModeState.cycleList!.length;
        let index = LabelingWorkflowManager.state.cycleModeState.currentIndex;
        if (index === undefined) {
            index = 0;
        } else {
            index -= count;
            while (index < 0) {
                index += total;
            }
        }

        IModelApp.viewManager.forEachViewport((vp: ScreenViewport) => {
            vp.zoomToElements(LabelingWorkflowManager.state.cycleModeState.cycleList![index!], ZOOM_OPTIONS);
        });

        LabelingWorkflowManager.store.dispatch<LabelingWorkflowManagerAction>({
            type: LabelingWorkflowManagerActionType.CycleModeIndexWasChanged,
            newIndex: index,
        });
    };

    /** Save labels */
    public static saveLabels = () => {

        console.log("saving...")

        if (LabelingWorkflowManager._labelInterface === undefined) {
            throw new Error();
        }

        if (LabelingWorkflowManager.state.elementStateMapIsDirty === false) {
            return;
        }

        const trueLabelMap = LabelingWorkflowManagerSelectors.trueLabelMap(LabelingWorkflowManager.state);

        LabelingWorkflowManager._labelInterface.setUserLabels(trueLabelMap).then(() => {
            LabelingWorkflowManager.store.dispatch<LabelingWorkflowManagerAction>({
                type: LabelingWorkflowManagerActionType.LabelsWereSaved,
            });
        });
    };

}





//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const AVAILABLE_COLOR_MODES: MachineLearningColorMode[] = [
    MachineLearningColorMode.Native,
    MachineLearningColorMode.LabelColors,
    MachineLearningColorMode.PredictionColors,
    MachineLearningColorMode.ConfusionsWithLabelColors,
    MachineLearningColorMode.ConfusionsWithPredictionColors,
];
