import { ElementState, ECClassState, ModelState, CategoryState, PredLabelState, TrueLabelState, CommonLabelState } from "./LabelingWorkflowState";
import { Id64String, Id64Set, Id64Array } from "@bentley/bentleyjs-core";
import { MachineLearningLabel, MachineLearningColorMode } from "../data/LabelTypes";
import { ScreenViewport } from "@bentley/imodeljs-frontend";
import { Frustum, ColorDef } from "@bentley/imodeljs-common";

/** Reducer action type */
export enum LabelingWorkflowManagerActionType {
    DataWasInitialized = "LabelingWorkflowManagerActionType.DataWasInitialized",
    SelectionHasChanged = "LabelingWorkflowManagerActionType.SelectionHasChanged",
    ElementLabelsWereChanged = "LabelingWorkflowManagerActionType.ElementLabelsWereChanged",
    ModelVisibilityWasChanged = "LabelingWorkflowManagerActionType.ModelVisibilityWasChanged",
    CategoryVisibilityWasChanged = "LabelingWorkflowManagerActionType.CategoryVisibilityWasChanged",
    ClassVisibilityWasChanged = "LabelingWorkflowManagerActionType.ClassVisibilityWasChanged",
    PredLabelVisibilityWasChanged = "LabelingWorkflowManagerActionType.PredictionVisibilityWasChanged",
    TrueLabelVisibilityWasChanged = "LabelingWorkflowManagerActionType.LabelVisibilityWasChanged",
    SelectionLabelWasChanged = "LabelingWorkflowManagerActionType.SelectionLabelWasChanged",
    UndoWasRequested = "LabelingWorkflowManagerActionType.UndoWasRequested",
    RedoWasRequested = "LabelingWorkflowManagerActionType.RedoWasRequested",
    ColorModeWasChanged = "LabelingWorkflowManagerActionType.ColorModeWasChanged",
    CycleModeActionStarted = "LabelingWorkflowManagerActionType.CycleModeActionStarted",
    CycleModeWasEnabled = "LabelingWorkflowManagerActionType.CycleModeWasEnabled",
    CycleModeWasDisabled = "LabelingWorkflowManagerActionType.CycleModeWasDisabled",
    CycleModeIndexWasChanged = "LabelingWorkflowManagerActionType.CycleModeIndexWasChanged",
    LabelColorWasChanged = "LabelingWorkflowManagerActionType.LabelColorWasChanged",
    LabelExpandStateWasChanged = "LabelingWorkflowManagerActionType.LabelExpandStateWasChanged",
    LabelsWereSaved = "LabelingWorkflowManagerActionType.LabelsWereSaved",
    VisiblityStatesSwapped = "LabelingWorkflowManagerActionType.VisiblityStatesSwapped",
    ForceShowAllChanged = "LabelingWorkflowManagerActionType.ForceShowAllChanged",
}

/** Reducer action */
export interface LabelingWorkflowManagerAction {
    /** Action type */
    type: LabelingWorkflowManagerActionType;

    /** State map for models */
    modelStateMap?: Map<Id64String, ModelState>;
    /** State map for categories */
    categoryStateMap?: Map<Id64String, CategoryState>;
    /** State map for classes */
    classStateMap?: Map<Id64String, ECClassState>;
    /** State map for machine learning labels */
    trueLabelStateMap?: Map<MachineLearningLabel, TrueLabelState>;
    /** State map for machine learning predictions */
    predLabelStateMap?: Map<MachineLearningLabel, PredLabelState>;
    /** Common state map for labels */
    commonLabelStateMap?: Map<MachineLearningLabel, CommonLabelState>;

    elementStateMap?: Map<Id64String, ElementState>;
    elementSet?: Id64Set;
    label?: MachineLearningLabel;
    elementId?: Id64String;
    displayed?: boolean;
    transparent?: boolean;
    colorMode?: MachineLearningColorMode;
    newIndex?: number;
    cycleList?: Id64Array;
    initialFrustums?: Map<ScreenViewport, Frustum>;
    newColor?: ColorDef;
    newExpanded?: boolean;
    newForceShowAll?: boolean;
}
