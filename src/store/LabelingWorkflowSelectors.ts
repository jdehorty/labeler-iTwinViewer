import { Id64Array, Id64Set, Id64String } from "@bentley/bentleyjs-core";
import { ColorDef } from "@bentley/imodeljs-common";
import { createSelector } from "reselect";
import { MachineLearningColorMode, MachineLearningLabel } from "../data/LabelTypes";
import { getWithDefault, MapWithDefault } from "../utils/MapWithDefault";
import { CategoryState, CommonLabelState, ECClassState, ElementState, LabelingWorkflowState, ModelState, PredLabelState, TrueLabelState } from "./LabelingWorkflowState";
import { MachineLearningElementOverrideData, MLStateTableDataItem, SimpleStateTableDataItem, LabelTreeEntry } from "./LabelingWorkflowTypes";

const SELECTION_COUNT_IS_FILTERED = true;


/** Contains selectors that derive storage from LabelingWorkflowManager's state */
export class LabelingWorkflowManagerSelectors {

    /** Returns color/alpha storage for the feature override provider */
    public static elementOverrideData = createSelector(
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.elementStateMap(state),
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.colorMap(state),
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.visibilityMap(state),
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.transparencyMap(state),
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.emphasisMap(state),
        (
            elementStateMap: Map<Id64String, ElementState>,
            colorMap: Map<Id64String, ColorDef>,
            visibilityMap: Map<Id64String, boolean>,
            transparencyMap: Map<Id64String, boolean>,
            emphasisMap: Map<Id64String, boolean>,
        ): MachineLearningElementOverrideData[] => {
            const data: MachineLearningElementOverrideData[] = [];

            for (const elementId of elementStateMap.keys()) {

                data.push({
                    elementId: elementId,
                    colorOverride: getWithDefault(colorMap, elementId, undefined),
                    isVisible: getWithDefault(visibilityMap, elementId, true),
                    isTransparent: getWithDefault(transparencyMap, elementId, false),
                    isEmphasized: getWithDefault(emphasisMap, elementId, false),
                });

            }

            return data;
        }
    )

    /** Returns a set of selectable elements */
    public static selectableSet = createSelector(
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.elementStateMap(state),
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.visibilityMap(state),
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.transparencyMap(state),
        (
            elementStateMap: Map<Id64String, ElementState>,
            visibilityMap: Map<Id64String, boolean>,
            transparencyMap: Map<Id64String, boolean>,
        ): Id64Set => {
            const finalSet = new Set<Id64String>();
            for (const elementId of elementStateMap.keys()) {
                const isVisible = getWithDefault(visibilityMap, elementId, true);
                const isTransparent = getWithDefault(transparencyMap, elementId, false);
                if (isVisible && !isTransparent) {
                    finalSet.add(elementId);
                }
            }
            return finalSet;
        }
    );

    /** Returns the set of selected & visible elements */
    public static validSelectionSubset = createSelector(
        (state: LabelingWorkflowState) => state.selectionSet,
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.visibilityMap(state),
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.transparencyMap(state),
        (
            selectionSet: Id64Set,
            visibilityMap: Map<Id64String, boolean>,
            transparencyMap: Map<Id64String, boolean>,
        ): Id64Set => {
            const finalSet = new Set<Id64String>();
            for (const elementId of selectionSet) {
                const isVisible = getWithDefault(visibilityMap, elementId, true);
                const isTransparent = getWithDefault(transparencyMap, elementId, false);
                if (isVisible && !isTransparent) {
                    finalSet.add(elementId);
                }
            }
            return finalSet;
        }
    );

    /** Gets to current elementStateMap from the history */
    public static elementStateMap = createSelector(
        (state: LabelingWorkflowState) => state.elementStateMapHistory,
        (state: LabelingWorkflowState) => state.elementStateMapIndex,
        (
            elementStateMapHistory: Map<Id64String, ElementState>[],
            elementStateMapIndex: number,
        ): Map<Id64String, ElementState> => {
            if (elementStateMapIndex < 0 || elementStateMapIndex >= elementStateMapHistory.length) {
                throw new Error("History indexing error");
            }
            return elementStateMapHistory[elementStateMapIndex];
        }
    );


    /** Computes a color map for elements based on the current color mode and labels/predictions */
    public static colorMap = createSelector(
        (state: LabelingWorkflowState) => state.trueLabelStateMap,
        (state: LabelingWorkflowState) => state.predLabelStateMap,
        (state: LabelingWorkflowState) => state.commonLabelStateMap,
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.elementStateMap(state),
        (state: LabelingWorkflowState) => state.colorMode,
        (
            trueLabelStateMap: Map<MachineLearningLabel, TrueLabelState>,
            predLabelStateMap: Map<MachineLearningLabel, PredLabelState>,
            commonLabelStateMap: Map<MachineLearningLabel, CommonLabelState>,
            elementStateMap: Map<Id64String, ElementState>,
            colorMode: MachineLearningColorMode,
        ): Map<Id64String, ColorDef> => {
            const colorMap = new Map<Id64String, ColorDef>();
            if (colorMode !== MachineLearningColorMode.Native) {
                for (const [elementId, elementState] of elementStateMap) {
                    switch (colorMode) {
                        case MachineLearningColorMode.ConfusionsWithLabelColors:
                        case MachineLearningColorMode.LabelColors:
                            {
                                const labelState = commonLabelStateMap.get(elementState.trueLabel);
                                if (labelState !== undefined) {
                                    colorMap.set(elementId, labelState.color);
                                }
                                break;
                            }
                        case MachineLearningColorMode.ConfusionsWithPredictionColors:
                        case MachineLearningColorMode.PredictionColors:
                            {
                                const labelState = commonLabelStateMap.get(elementState.predLabel);
                                if (labelState !== undefined) {
                                    colorMap.set(elementId, labelState.color);
                                }
                                break;
                            }
                        default:
                            break;
                    }
                }
            }
            return colorMap;
        }
    )


    /** Computes the current true label map */
    public static trueLabelMap = createSelector(
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.elementStateMap(state),
        (
            elementStateMap: Map<Id64String, ElementState>,
        ): Map<Id64String, MachineLearningLabel> => {

            const labelMap = new Map<Id64String, MachineLearningLabel>();
            for (const [elementId, elementState] of elementStateMap) {
                labelMap.set(elementId, elementState.trueLabel);
            }
            return labelMap;
        }
    );

    /** Computes an emphasis map for elements */
    public static emphasisMap = createSelector(
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.elementStateMap(state),
        (state: LabelingWorkflowState) => state.cycleModeState.enabled,
        (state: LabelingWorkflowState) => state.cycleModeState.cycleList,
        (
            elementStateMap: Map<Id64String, ElementState>,
            cycleEnabled: boolean,
            cycleSelection?: Id64Array,
        ): Map<Id64String, boolean> => {

            const emphasisMap = new Map<Id64String, boolean>();
            const cycleSet = cycleSelection !== undefined ? new Set(cycleSelection) : undefined;
            for (const elementId of elementStateMap.keys()) {
                // Special case for cycling mode
                if (cycleEnabled && cycleSet !== undefined && cycleSet.has(elementId)) {
                    emphasisMap.set(elementId, true);
                } else {
                    emphasisMap.set(elementId, false);
                }
            }
            return emphasisMap;
        }
    );

    /** Check if true label and predicted label match */
    private static _labelsMatch(
        commonLabelStateMap: Map<MachineLearningLabel, CommonLabelState>,
        trueLabel: MachineLearningLabel,
        predLabel: MachineLearningLabel,
    ): boolean {

        // Go upstream from true label
        let current: MachineLearningLabel | undefined = trueLabel;
        let target = predLabel;
        while (current !== undefined) {
            if (current === target) {
                return true;
            }
            current = commonLabelStateMap.get(current)!.parentLabel;
        }

        // Go upstream from predicted label
        current = predLabel;
        target = trueLabel;
        while (current !== undefined) {
            if (current === target) {
                return true;
            }
            current = commonLabelStateMap.get(current)!.parentLabel;
        }

        return false;
    }

    /** Computes a transparency map for elements */
    public static transparencyMap = createSelector(
        (state: LabelingWorkflowState) => state.modelStateMap,
        (state: LabelingWorkflowState) => state.categoryStateMap,
        (state: LabelingWorkflowState) => state.classStateMap,
        (state: LabelingWorkflowState) => state.trueLabelStateMap,
        (state: LabelingWorkflowState) => state.predLabelStateMap,
        (state: LabelingWorkflowState) => state.commonLabelStateMap,
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.elementStateMap(state),
        (state: LabelingWorkflowState) => state.colorMode,
        (state: LabelingWorkflowState) => state.forceShowAll,
        (state: LabelingWorkflowState) => state.cycleModeState.enabled,
        (state: LabelingWorkflowState) => state.cycleModeState.cycleList,
        (
            modelStateMap: Map<Id64String, ModelState>,
            categoryStateMap: Map<Id64String, CategoryState>,
            classStateMap: Map<Id64String, ECClassState>,
            trueLabelStateMap: Map<MachineLearningLabel, TrueLabelState>,
            predLabelStateMap: Map<MachineLearningLabel, PredLabelState>,
            commonLabelStateMap: Map<MachineLearningLabel, CommonLabelState>,
            elementStateMap: Map<Id64String, ElementState>,
            colorMode: MachineLearningColorMode,
            forceShowAll: boolean,
            cycleEnabled: boolean,
            cycleSelection?: Id64Array,
        ): Map<Id64String, boolean> => {

            const cycleSet = cycleSelection !== undefined ? new Set(cycleSelection) : undefined;
            const transparentMap = new Map<Id64String, boolean>();
            for (const [elementId, elementState] of elementStateMap) {
                let transparent = false;
                // Apply model transparency
                const modelState = modelStateMap.get(elementState.modelId);
                if (modelState !== undefined && modelState.isTransparent) {
                    transparent = true;
                }
                // Apply category transparency
                const categoryState = categoryStateMap.get(elementState.categoryId);
                if (categoryState !== undefined && categoryState.isTransparent) {
                    transparent = true;
                }
                // Apply ecclass transparency
                const classState = classStateMap.get(elementState.classId);
                if (classState !== undefined && classState.isTransparent) {
                    transparent = true;
                }
                // Apply prediction transparency
                const predictionState = predLabelStateMap.get(elementState.predLabel);
                if (predictionState !== undefined && predictionState.isTransparent) {
                    transparent = true;
                }
                // Apply label transparency
                const labelState = trueLabelStateMap.get(elementState.trueLabel);
                if (labelState !== undefined && labelState.isTransparent) {
                    transparent = true;
                }
                // Special colorMode cases:
                if (colorMode === MachineLearningColorMode.ConfusionsWithLabelColors ||
                    colorMode === MachineLearningColorMode.ConfusionsWithPredictionColors)
                {
                    if (LabelingWorkflowManagerSelectors._labelsMatch(
                        commonLabelStateMap,
                        elementState.trueLabel,
                        elementState.predLabel,
                    )) {
                        transparent = true;
                    }
                }
                // Special case for cycling mode
                if (cycleEnabled && cycleSet !== undefined && !cycleSet.has(elementId)) {
                    transparent = true;
                }
                // Override transparency based on forceShowAll
                if (forceShowAll) {
                    transparent = false;
                }
                transparentMap.set(elementId, transparent);
            }
            return transparentMap;
        }
    );


    /** Computes a visibility map for elements */
    public static visibilityMap = createSelector(
        (state: LabelingWorkflowState) => state.modelStateMap,
        (state: LabelingWorkflowState) => state.categoryStateMap,
        (state: LabelingWorkflowState) => state.classStateMap,
        (state: LabelingWorkflowState) => state.trueLabelStateMap,
        (state: LabelingWorkflowState) => state.predLabelStateMap,
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.elementStateMap(state),
        (state: LabelingWorkflowState) => state.forceShowAll,
        (
            modelStateMap: Map<Id64String, ModelState>,
            categoryStateMap: Map<Id64String, CategoryState>,
            classStateMap: Map<Id64String, ECClassState>,
            trueLabelStateMap: Map<MachineLearningLabel, TrueLabelState>,
            predLabelStateMap: Map<MachineLearningLabel, PredLabelState>,
            elementStateMap: Map<Id64String, ElementState>,
            forceShowAll: boolean,
        ): Map<Id64String, boolean> => {

            const visMap = new Map<Id64String, boolean>();
            for (const [elementId, elementState] of elementStateMap) {
                let visible = true;
                // Apply model visibility
                const modelState = modelStateMap.get(elementState.modelId);
                if (modelState !== undefined && !modelState.isDisplayed) {
                    visible = false;
                }
                // Apply category visibility
                const categoryState = categoryStateMap.get(elementState.categoryId);
                if (categoryState !== undefined && !categoryState.isDisplayed) {
                    visible = false;
                }
                // Apply ecclass visibility
                const classState = classStateMap.get(elementState.classId);
                if (classState !== undefined && !classState.isDisplayed) {
                    visible = false;
                }
                // Apply prediction visibility
                const predictionState = predLabelStateMap.get(elementState.predLabel);
                if (predictionState !== undefined && !predictionState.isDisplayed) {
                    visible = false;
                }
                // Apply label visibility
                const labelState = trueLabelStateMap.get(elementState.trueLabel);
                if (labelState !== undefined && !labelState.isDisplayed) {
                    visible = false;
                }
                // Override based on forceShowAll
                if (forceShowAll) {
                    visible = true;
                }
                visMap.set(elementId, visible);
            }
            return visMap;
        }
    );

    /** Computes storage to make a table of models */
    public static modelTableData = createSelector(
        (state: LabelingWorkflowState) => state.modelStateMap,
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.elementStateMap(state),
        (state: LabelingWorkflowState) => state.selectionSet,
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.visibilityMap(state),
        (
            modelStateMap: Map<Id64String, ModelState>,
            elementStateMap: Map<Id64String, ElementState>,
            selectionSet: Id64Set,
            visibilityMap: Map<Id64String, boolean>,
        ): SimpleStateTableDataItem[] => {

            const totalCountMap = new MapWithDefault<Id64String, number>(()=>0);
            const visibleCountMap = new MapWithDefault<Id64String, number>(()=>0);
            const selectedCountMap = new MapWithDefault<Id64String, number>(()=>0);
            for (const [elementId, elementState] of elementStateMap) {
                const modelId = elementState.modelId;
                totalCountMap.set(modelId, totalCountMap.get(modelId) + 1);
                if (visibilityMap.get(elementId)) {
                    visibleCountMap.set(modelId, visibleCountMap.get(modelId) + 1);
                }
                if (!SELECTION_COUNT_IS_FILTERED || visibilityMap.get(elementId)) {
                    if (selectionSet.has(elementId)) {
                        selectedCountMap.set(modelId, selectedCountMap.get(modelId) + 1);
                    }
                }
            }
            const items: SimpleStateTableDataItem[] = [];
            for (const [modelId, modelState] of modelStateMap) {
                items.push({
                    groupId: modelId,
                    displayLabel: modelState.displayLabel !== undefined ? modelState.displayLabel : modelId,
                    isDisplayed: modelState.isDisplayed,
                    isTransparent: modelState.isTransparent,
                    totalCount: totalCountMap.get(modelId),
                    visibleCount: visibleCountMap.get(modelId),
                    selectedCount: selectedCountMap.get(modelId),
                });
            }
            return items;
        }
    );

    /** Computes storage to make a table of categories */
    public static categoryTableData = createSelector(
        (state: LabelingWorkflowState) => state.categoryStateMap,
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.elementStateMap(state),
        (state: LabelingWorkflowState) => state.selectionSet,
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.visibilityMap(state),
        (
            categoryStateMap: Map<Id64String, CategoryState>,
            elementStateMap: Map<Id64String, ElementState>,
            selectionSet: Id64Set,
            visibilityMap: Map<Id64String, boolean>,
        ): SimpleStateTableDataItem[] => {

            const totalCountMap = new MapWithDefault<Id64String, number>(()=>0);
            const visibleCountMap = new MapWithDefault<Id64String, number>(()=>0);
            const selectedCountMap = new MapWithDefault<Id64String, number>(()=>0);
            for (const [elementId, elementState] of elementStateMap) {
                const categoryId = elementState.categoryId;
                totalCountMap.set(categoryId, totalCountMap.get(categoryId) + 1);
                if (visibilityMap.get(elementId)) {
                    visibleCountMap.set(categoryId, visibleCountMap.get(categoryId) + 1);
                }
                if (!SELECTION_COUNT_IS_FILTERED || visibilityMap.get(elementId)) {
                    if (selectionSet.has(elementId)) {
                        selectedCountMap.set(categoryId, selectedCountMap.get(categoryId) + 1);
                    }
                }
            }
            const items: SimpleStateTableDataItem[] = [];
            for (const [categoryId, categoryState] of categoryStateMap) {
                items.push({
                    groupId: categoryId,
                    displayLabel: categoryState.displayLabel !== undefined ? categoryState.displayLabel : categoryId,
                    isDisplayed: categoryState.isDisplayed,
                    isTransparent: categoryState.isTransparent,
                    totalCount: totalCountMap.get(categoryId),
                    visibleCount: visibleCountMap.get(categoryId),
                    selectedCount: selectedCountMap.get(categoryId),
                });
            }
            return items;
        }
    );

    /** Computes storage to make a table of classes */
    public static classTableData = createSelector(
        (state: LabelingWorkflowState) => state.classStateMap,
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.elementStateMap(state),
        (state: LabelingWorkflowState) => state.selectionSet,
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.visibilityMap(state),
        (
            classStateMap: Map<Id64String, ECClassState>,
            elementStateMap: Map<Id64String, ElementState>,
            selectionSet: Id64Set,
            visibilityMap: Map<Id64String, boolean>,
        ): SimpleStateTableDataItem[] => {

            const totalCountMap = new MapWithDefault<Id64String, number>(()=>0);
            const visibleCountMap = new MapWithDefault<Id64String, number>(()=>0);
            const selectedCountMap = new MapWithDefault<Id64String, number>(()=>0);
            for (const [elementId, elementState] of elementStateMap) {
                const classId = elementState.classId;
                totalCountMap.set(classId, totalCountMap.get(classId) + 1);
                if (visibilityMap.get(elementId)) {
                    visibleCountMap.set(classId, visibleCountMap.get(classId) + 1);
                }
                if (!SELECTION_COUNT_IS_FILTERED || visibilityMap.get(elementId)) {
                    if (selectionSet.has(elementId)) {
                        selectedCountMap.set(classId, selectedCountMap.get(classId) + 1);
                    }
                }
            }
            const items: SimpleStateTableDataItem[] = [];
            for (const [classId, classState] of classStateMap) {
                items.push({
                    groupId: classId,
                    displayLabel: classState.displayLabel !== undefined ? classState.displayLabel : classId,
                    isDisplayed: classState.isDisplayed,
                    isTransparent: classState.isTransparent,
                    totalCount: totalCountMap.get(classId),
                    visibleCount: visibleCountMap.get(classId),
                    selectedCount: selectedCountMap.get(classId),
                });
            }
            return items;
        }
    );

    /** Computes storage to make a table of machine learning labels and predictions */
    public static mlTableData = createSelector(
        (state: LabelingWorkflowState) => state.trueLabelStateMap,
        (state: LabelingWorkflowState) => state.predLabelStateMap,
        (state: LabelingWorkflowState) => state.commonLabelStateMap,
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.elementStateMap(state),
        (state: LabelingWorkflowState) => state.selectionSet,
        (state: LabelingWorkflowState) => LabelingWorkflowManagerSelectors.visibilityMap(state),
        (
            trueLabelStateMap: Map<MachineLearningLabel, TrueLabelState>,
            predLabelStateMap: Map<MachineLearningLabel, PredLabelState>,
            commonLabelStateMap: Map<MachineLearningLabel, CommonLabelState>,
            elementStateMap: Map<Id64String, ElementState>,
            selectionSet: Id64Set,
            visibilityMap: Map<Id64String, boolean>,
        ): Map<MachineLearningLabel, MLStateTableDataItem> => {

            // Get all available names
            const allNames = new Set<MachineLearningLabel>();
            for (const name of trueLabelStateMap.keys()) {
                allNames.add(name);
            }
            for (const name of predLabelStateMap.keys()) {
                allNames.add(name);
            }

            // Build the table

            const labelTotalCountMap = new MapWithDefault<MachineLearningLabel, number>(()=>0);
            const labelVisibleCountMap = new MapWithDefault<MachineLearningLabel, number>(()=>0);
            const labelSelectedCountMap = new MapWithDefault<MachineLearningLabel, number>(()=>0);
            const predictionTotalCountMap = new MapWithDefault<MachineLearningLabel, number>(()=>0);
            const predictionVisibleCountMap = new MapWithDefault<MachineLearningLabel, number>(()=>0);
            const predictionSelectedCountMap = new MapWithDefault<MachineLearningLabel, number>(()=>0);
            const hasDataSet = new Set<MachineLearningLabel>();
            for (const [elementId, elementState] of elementStateMap) {
                const label = elementState.trueLabel;
                if (label !== undefined) {
                    hasDataSet.add(label);
                    labelTotalCountMap.set(label, labelTotalCountMap.get(label) + 1);
                    if (visibilityMap.get(elementId)) {
                        labelVisibleCountMap.set(label, labelVisibleCountMap.get(label) + 1);
                    }
                    if (!SELECTION_COUNT_IS_FILTERED || visibilityMap.get(elementId)) {
                        if (selectionSet.has(elementId)) {
                            labelSelectedCountMap.set(label, labelSelectedCountMap.get(label) + 1);
                        }
                    }
                }
                const prediction = elementState.predLabel;
                if (prediction !== undefined) {
                    hasDataSet.add(prediction);
                    predictionTotalCountMap.set(prediction, predictionTotalCountMap.get(prediction) + 1);
                    if (visibilityMap.get(elementId)) {
                        predictionVisibleCountMap.set(prediction, predictionVisibleCountMap.get(prediction) + 1);
                    }
                    if (!SELECTION_COUNT_IS_FILTERED || visibilityMap.get(elementId)) {
                        if (selectionSet.has(elementId)) {
                            predictionSelectedCountMap.set(prediction, predictionSelectedCountMap.get(prediction) + 1);
                        }
                    }
                }
            }

            const itemMap = new Map<MachineLearningLabel, MLStateTableDataItem>();
            for (const name of allNames) {
                let color = ColorDef.white;
                if (commonLabelStateMap.has(name)) {
                    color = commonLabelStateMap.get(name)!.color;
                }
                const data: MLStateTableDataItem = {
                    name: name,
                    color: color,

                    hasData: hasDataSet.has(name),

                    trueLabelIsDisplayed: trueLabelStateMap.has(name) ? trueLabelStateMap.get(name)!.isDisplayed : true,
                    trueLabelIsTransparent: trueLabelStateMap.has(name) ? trueLabelStateMap.get(name)!.isTransparent : false,
                    trueLabelTotalCount: 0,
                    trueLabelVisibleCount: 0,
                    trueLabelSelectedCount: 0,

                    predLabelIsDisplayed: predLabelStateMap.has(name) ? predLabelStateMap.get(name)!.isDisplayed : true,
                    predLabelIsTransparent: predLabelStateMap.has(name) ? predLabelStateMap.get(name)!.isTransparent : false,
                    predLabelTotalCount: 0,
                    predLabelVisibleCount: 0,
                    predLabelSelectedCount: 0,
                };

                const _recurse = (name: MachineLearningLabel, force_recurse: boolean) => {
                    data.trueLabelTotalCount += labelTotalCountMap.get(name)!;
                    data.trueLabelVisibleCount += labelVisibleCountMap.get(name)!;
                    data.trueLabelSelectedCount += labelSelectedCountMap.get(name)!;
                    data.predLabelTotalCount += predictionTotalCountMap.get(name)!;
                    data.predLabelVisibleCount += predictionVisibleCountMap.get(name)!;
                    data.predLabelSelectedCount += predictionSelectedCountMap.get(name)!;
                    if (!commonLabelStateMap.get(name)!.isExpanded || force_recurse) {
                        for (const child of commonLabelStateMap.get(name)!.childrenLabels) {
                            _recurse(child, true);
                        }
                    }
                };
                _recurse(name, false);

                itemMap.set(name, data);
            }
            return itemMap;
        }
    );


    public static canUndo(state: LabelingWorkflowState) : boolean {
        return state.elementStateMapIndex > 0;
    }
    public static canRedo(state: LabelingWorkflowState) : boolean {
        return state.elementStateMapIndex < state.elementStateMapHistory.length-1;
    }



    public static treeData = createSelector(
        (state: LabelingWorkflowState) => state.commonLabelStateMap,
        (
            /** Common label state map */
            commonLabelStateMap: Map<MachineLearningLabel, CommonLabelState>,
        ): LabelTreeEntry[] => {

            // Find root-level labels
            const rootLabels: Array<MachineLearningLabel> = [];
            for (const [name, labelState] of commonLabelStateMap) {
                if (labelState.parentLabel === undefined) {
                    rootLabels.push(name);
                }
            }

            // Keep track of seen labels to detect loops
            const seenLabels = new Set<MachineLearningLabel>();

            const _recurse = (name: MachineLearningLabel, level: number = 0): LabelTreeEntry => {
                if (seenLabels.has(name)) {
                    throw new Error("Label graph/tree must be acyclical");
                }
                seenLabels.add(name);
                const childEntries: LabelTreeEntry[] = [];
                for (const child of commonLabelStateMap.get(name)!.childrenLabels) {
                    childEntries.push(_recurse(child, level + 1));
                }
                return {
                    name: name,
                    isExpanded: commonLabelStateMap.get(name)!.isExpanded,
                    level: level,
                    children: childEntries,
                };
            }

            // Build tree storage
            const treeEntries: LabelTreeEntry[] = [];
            for (const name of rootLabels) {
                treeEntries.push(_recurse(name));
            }

            return treeEntries;
        }
    );


}
