/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { createStore, combineReducers, Store } from "redux";
import { FrameworkState, FrameworkReducer } from "@bentley/ui-framework";
// import { SelectionExtenderState, SelectionExtenderReducer } from "../SelectionExtender";
import { LabelingWorkflowManagerReducer } from "./LabelingWorkflowReducer";
import { LabelingWorkflowState } from "./LabelingWorkflowState";
import { SelectionExtenderState } from "./SelectionExtenderState";
import { SelectionExtenderReducer } from "./SelectionExtenderReducer2";

// React-redux interface stuff
export interface RootState {
    frameworkState?: FrameworkState;
    selectionExtenderState?: SelectionExtenderState;
    labelingWorkflowManagerState?: LabelingWorkflowState;
}

export interface RootAction {
    type: string;
}

export type AppStore = Store<RootState>;

/**
 * Centralized state management class using Redux actions, reducers and store.
 */
export class AppState {
    private _store: AppStore;
    private _rootReducer: any;

    constructor() {
        // this is the rootReducer for the sample application.
        this._rootReducer = combineReducers<RootState>({
            frameworkState: FrameworkReducer,
            selectionExtenderState: SelectionExtenderReducer,
            labelingWorkflowManagerState: LabelingWorkflowManagerReducer,
        } as any);

        // create the Redux Store.
        this._store = createStore(this._rootReducer,
            (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__({ trace: true, traceLimit: 25 }));
    }

    public get store(): Store<RootState> {
        return this._store;
    }

}
