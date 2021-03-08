export enum MatchingRuleType {
    SameClass = "SelectionExtender:MatchingRuleType.SameClass",
    SameUserLabel = "SelectionExtender:MatchingRuleType.SameUserLabel",
    SameCategory = "SelectionExtender:MatchingRuleType.SameCategory",
    SameParent = "SelectionExtender:MatchingRuleType.SameParent",
    SameModel = "SelectionExtender:MatchingRuleType.SameModel",
    SameCodeValue = "SelectionExtender:MatchingRuleType.SameCodeValue",
    SameLastMod = "SelectionExtender:MatchingRuleType.SameLastMod",
    SameJsonProps = "SelectionExtender:MatchingRuleType.SameJsonProps",
    SameGeometry = "SelectionExtender:MatchingRuleType.SameGeometry",
    SameGeometrySize = "SelectionExtender:MatchingRuleType.SameGeometrySize",
    SameBBoxHeight = "SelectionExtender:MatchingRuleType.SameBBoxHeight",
    SameBBoxVolume = "SelectionExtender:MatchingRuleType.SameBBoxVolume",
    SameElementAspect = "SelectionExtender:MatchingRuleType.SameElementAspect",
}

export enum MatchingOperator {
    And = "AND",
    Or = "OR",
}

export interface SelectionExtenderConfig {
    visibleInViewOnly: boolean;
    maxDistEnabled: boolean;
    maxDistValue: number;
    maxCountEnabled: boolean;
    maxCountValue: number;
    rule: SimpleArrayRule;
    enableAuxData: boolean;
}

export interface SimpleArrayRule {
    childRules: SimpleArrayRuleEntry[];
    operator: MatchingOperator;
}

export interface SimpleArrayRuleEntry {
    wanted: boolean;
    type: MatchingRuleType;
}