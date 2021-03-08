import { SelectionExtenderState } from "./SelectionExtenderState";
import { INITIAL_STATE } from "./SelectionExtenderState";
import { SelectionExtenderAction, SelectionExtenderActionType } from "./SelectionExtenderActions"
import { SelectionExtenderConfig } from "./SelectionExtenderTypes";


export function SelectionExtenderReducer(prevState: SelectionExtenderState = INITIAL_STATE, action: SelectionExtenderAction): SelectionExtenderState {
    switch (action.type) {
        case SelectionExtenderActionType.SINGLE_KEY_HAS_CHANGED:
            return {
                ...prevState,
                singleKey: action.newSingleKey!,
                contentMap: action.newContentMap!,
            };
        case SelectionExtenderActionType.CONFIG_WAS_CHANGED:
            // Create a deep-ish copy of the config
            const configCopy: SelectionExtenderConfig = {
                ...action.newConfig!,
                rule: {
                    ...action.newConfig!.rule,
                    childRules: Array.from(action.newConfig!.rule.childRules),
                }
            }
            return {...prevState, config: configCopy};
        case SelectionExtenderActionType.SEARCH_HAS_STARTED:
            return {
                ...prevState,
                isSearching: true,
            };
        case SelectionExtenderActionType.ELEMENTS_WERE_FOUND:
            return {
                ...prevState,
                isSearching: false,
                foundCount: action.newFoundCount,
            };
        default:
            return prevState;
    }
}
