import { Id64String } from "@bentley/bentleyjs-core";
import { MachineLearningLabel } from "../data/LabelTypes";
import { ColorDef } from "@bentley/imodeljs-common";

export interface SimpleStateTableDataItem {
    groupId: Id64String;
    displayLabel: string;
    isDisplayed: boolean;
    isTransparent: boolean;
    totalCount: number;
    visibleCount: number;
    selectedCount: number;
}

export interface LabelTreeEntry {
    name: MachineLearningLabel;
    isExpanded: boolean;
    level: number;
    children: LabelTreeEntry[];
}

export interface MLStateTableDataItem {
    name: MachineLearningLabel;
    color: ColorDef;

    hasData: boolean;

    trueLabelIsDisplayed: boolean;
    trueLabelIsTransparent: boolean;
    trueLabelTotalCount: number;
    trueLabelVisibleCount: number;
    trueLabelSelectedCount: number;

    predLabelIsDisplayed: boolean;
    predLabelIsTransparent: boolean;
    predLabelTotalCount: number;
    predLabelVisibleCount: number;
    predLabelSelectedCount: number;
}

export interface MachineLearningElementOverrideData {
    elementId: Id64String;
    colorOverride: ColorDef | undefined;
    isVisible: boolean;
    isTransparent: boolean;
    isEmphasized: boolean;
}
