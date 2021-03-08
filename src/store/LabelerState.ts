import {AppState, AppStore} from "./AppState";

export class LabelerState {

    private static _appState: AppState;

    public static get store(): AppStore {
        return this._appState.store;
    }

    public static init(): void {
        this._appState = new AppState();
    }
}
