import {MLStateTableDataItem, LabelTreeEntry} from "../store/LabelingWorkflowTypes";
import {MachineLearningColorMode, MachineLearningLabel} from "../data/LabelTypes";
import {Id64String} from "@bentley/bentleyjs-core";
import {AVAILABLE_COLOR_MODES, LabelingWorkflowManager} from "../LabelingWorkflowManager";
import {Dispatch} from "react";
import {connect} from "react-redux";
import {MLStateTableComponent} from "./MLStateTable";
import {ColorDef} from "@bentley/imodeljs-common";
import {LabelingWorkflowState} from "../store/LabelingWorkflowState";
import {LabelingWorkflowManagerSelectors} from "../store/LabelingWorkflowSelectors";
import {LabelingWorkflowManagerAction, LabelingWorkflowManagerActionType} from "../store/LabelingWorkflowActions";

interface StateFromProps3 {
    ready: boolean;
    itemMap: Map<MachineLearningLabel, MLStateTableDataItem>;
    labelTree: LabelTreeEntry[];
    canUndo: boolean;
    canRedo: boolean;
    availableColorModes: MachineLearningColorMode[];
    currentColorMode: MachineLearningColorMode;
    isDirty: boolean;

    onLabelSelectionClick(itemId?: MachineLearningLabel): void;

    onPredictionSelectionClick(itemId?: MachineLearningLabel): void;

    onSave(): void;
}

interface DispatchFromProps3 {
    onLabelExpandStateChange(newExpanded: boolean, name: MachineLearningLabel): void;

    onLabelColorChange(newColor: ColorDef, name: MachineLearningLabel): void;

    onLabelDisplayChange(newVisible: boolean, newTransparent: boolean, itemId?: Id64String): void;

    onPredictionDisplayChange(newVisible: boolean, newTransparent: boolean, itemId?: Id64String): void;

    onLabelApply(name: MachineLearningLabel): void;

    onUndo(): void;

    onRedo(): void;

    onChangeColorMode(colorMode: MachineLearningColorMode): void;

    onSwapTruePredDisplay(): void;
}

function mapStateToProps3(rootState: any): StateFromProps3 {
    const state = rootState[LabelingWorkflowManager.stateKey] as LabelingWorkflowState | undefined;
    // console.log('reached mapStateToProps3');
    if (!state) {
        console.log('rootState @mapStateToProps3 ==> ' + JSON.stringify(rootState));
        console.log('stateKey @mapStateToProps3 ==> ' + LabelingWorkflowManager.stateKey)
        throw new Error();
    }
    return {
        ready: state.ready,
        itemMap: LabelingWorkflowManagerSelectors.mlTableData(state),
        labelTree: LabelingWorkflowManagerSelectors.treeData(state),
        canUndo: LabelingWorkflowManagerSelectors.canUndo(state),
        canRedo: LabelingWorkflowManagerSelectors.canRedo(state),
        availableColorModes: AVAILABLE_COLOR_MODES,
        currentColorMode: state.colorMode,
        isDirty: state.elementStateMapIsDirty,
        onLabelSelectionClick: (itemId?: MachineLearningLabel): void => {
            LabelingWorkflowManager.selectLabel(itemId);
        },
        onPredictionSelectionClick: (itemId?: MachineLearningLabel): void => {
            LabelingWorkflowManager.selectPrediction(itemId);
        },
        onSave: LabelingWorkflowManager.saveLabels,
    };
}

function mapDispatchToProps3(dispatch: Dispatch<LabelingWorkflowManagerAction>): DispatchFromProps3 {
    return {
        onLabelExpandStateChange: (newExpanded: boolean, name: MachineLearningLabel) => {
            dispatch({
                type: LabelingWorkflowManagerActionType.LabelExpandStateWasChanged,
                newExpanded: newExpanded,
                label: name,
            })
        },
        onLabelColorChange: (newColor: ColorDef, name: MachineLearningLabel) => {
            dispatch({
                type: LabelingWorkflowManagerActionType.LabelColorWasChanged,
                newColor: newColor,
                label: name,
            })
        },
        onLabelDisplayChange: (newVisible: boolean, newTransparent: boolean, name?: MachineLearningLabel): void => {
            dispatch({
                type: LabelingWorkflowManagerActionType.TrueLabelVisibilityWasChanged,
                label: name,
                displayed: newVisible,
                transparent: newTransparent,
            });
        },
        onPredictionDisplayChange: (newVisible: boolean, newTransparent: boolean, name?: MachineLearningLabel): void => {
            dispatch({
                type: LabelingWorkflowManagerActionType.PredLabelVisibilityWasChanged,
                label: name,
                displayed: newVisible,
                transparent: newTransparent,
            });
        },
        onLabelApply: (name: MachineLearningLabel): void => {
            dispatch({
                type: LabelingWorkflowManagerActionType.SelectionLabelWasChanged,
                label: name,
            });
        },
        onUndo: () => {
            dispatch({
                type: LabelingWorkflowManagerActionType.UndoWasRequested,
            });
        },
        onRedo: () => {
            dispatch({
                type: LabelingWorkflowManagerActionType.RedoWasRequested,
            });
        },
        onChangeColorMode: (colorMode: MachineLearningColorMode) => {
            dispatch({
                type: LabelingWorkflowManagerActionType.ColorModeWasChanged,
                colorMode: colorMode,
            });
        },
        onSwapTruePredDisplay: () => {
            dispatch({
                type: LabelingWorkflowManagerActionType.VisiblityStatesSwapped,
            });
        },
    };
}

export const ConnectedMLTableComponent = connect<StateFromProps3, DispatchFromProps3>(mapStateToProps3, mapDispatchToProps3)(MLStateTableComponent);




