import {InstanceKey} from "@bentley/presentation-common";
import {MatchingRuleType, SelectionExtenderConfig} from "./SelectionExtenderTypes";

export interface SelectionExtenderAction {
    type: string;
    newSingleKey?: InstanceKey;
    newContentMap?: Map<MatchingRuleType, string[]>;
    newConfig?: SelectionExtenderConfig;
    newFoundCount?: number;
}

export enum SelectionExtenderActionType {
    SINGLE_KEY_HAS_CHANGED = "SelectionExtender.singleIdHasChanged",
    CONFIG_WAS_CHANGED = "SelectionExtender.configWasChanged",
    SEARCH_HAS_STARTED = "SelectionExtender.searchHasStarted",
    ELEMENTS_WERE_FOUND = "SelectionExtender.elementsWereFound",
}