import {
    MatchingOperator,
    MatchingRuleType,
    SelectionExtenderConfig,
} from "./SelectionExtenderTypes";
import {InstanceKey} from "@bentley/presentation-common";


export interface SelectionExtenderState {
    singleKey?: InstanceKey;
    foundCount?: number;
    isSearching: boolean;
    config: SelectionExtenderConfig;
    contentMap: Map<MatchingRuleType, string[]>;
}

export const INITIAL_STATE: SelectionExtenderState = {
    singleKey: undefined,
    foundCount: undefined,
    isSearching: false,
    config: {
        visibleInViewOnly: false,
        maxDistEnabled: false,
        maxDistValue: 4.0,
        maxCountEnabled: false,
        maxCountValue: 1000,
        rule: {
            childRules: [
                { wanted: false, type: MatchingRuleType.SameElementAspect },
                { wanted: true, type: MatchingRuleType.SameUserLabel },
                { wanted: false, type: MatchingRuleType.SameCategory },
                { wanted: false, type: MatchingRuleType.SameClass },
                { wanted: false, type: MatchingRuleType.SameBBoxHeight },
                { wanted: true, type: MatchingRuleType.SameBBoxVolume },
                { wanted: true, type: MatchingRuleType.SameModel },
                { wanted: false, type: MatchingRuleType.SameParent },
                { wanted: false, type: MatchingRuleType.SameGeometry },
                { wanted: false, type: MatchingRuleType.SameGeometrySize },
            ],
            operator: MatchingOperator.And,
        },
        enableAuxData: false,
    },
    contentMap: new Map<MatchingRuleType, string[]>(),
}