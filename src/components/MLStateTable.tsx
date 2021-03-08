import {Id64String} from "@bentley/bentleyjs-core";
import {ColorDef} from "@bentley/imodeljs-common";
import {IModelApp} from "@bentley/imodeljs-frontend";
import {ColorPickerButton} from "@bentley/ui-components";
import {Button, Icon, Spinner, SpinnerSize, LabeledToggle, ButtonType} from "@bentley/ui-core";
import * as React from "react";
import {MachineLearningColorMode, MachineLearningLabel} from "../data/LabelTypes";
import '../styles/LabelingWorkflowStyles.scss';
import {LabelTreeEntry, MLStateTableDataItem} from "../store/LabelingWorkflowTypes";
import {AppearanceBatchToggleComponent} from "./AppearanceBatchToggle";
import {AppearanceToggleComponent} from "./AppearanceToggle";
import {AssignLabelButton} from "./AssignLabelButton";
import {GroupSelectButtonComponent} from "./GroupSelectButton";


const FORCE_ALL = true;
const MINUTES = 1.0;

interface MLStateTableComponentState {
    timerVar: any;
    filterEmptyRows: boolean;
}

export interface MLStateTableComponentProps {
    ready: boolean;
    itemMap: Map<MachineLearningLabel, MLStateTableDataItem>;
    labelTree: LabelTreeEntry[];
    canUndo: boolean;
    canRedo: boolean;
    availableColorModes: MachineLearningColorMode[];
    currentColorMode: MachineLearningColorMode;
    isDirty: boolean;

    onLabelDisplayChange(newVisible: boolean, newTransparent: boolean, itemId?: Id64String): void;

    onLabelSelectionClick(itemId?: MachineLearningLabel): void;

    onLabelColorChange(newColor: ColorDef, name: MachineLearningLabel): void;

    onLabelExpandStateChange(newExpanded: boolean, name: MachineLearningLabel): void;

    onLabelApply(name: MachineLearningLabel): void;

    onPredictionDisplayChange(newVisible: boolean, newTransparent: boolean, itemId?: Id64String): void;

    onPredictionSelectionClick(itemId?: MachineLearningLabel): void;

    onSave(): void;

    onUndo(): void;

    onRedo(): void;

    onChangeColorMode(colorMode: MachineLearningColorMode): void;

    onSwapTruePredDisplay(): void;
}


export class MLStateTableComponent extends React.Component<MLStateTableComponentProps, MLStateTableComponentState> {

    constructor(props: MLStateTableComponentProps) {
        super(props);
        // console.log("MLStateTableComponent ctor props => " + JSON.stringify(props));
        this.state = {
            timerVar: undefined,
            filterEmptyRows: false,
        };
    }

    private handleColorModeChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        if (event.target !== undefined) {
            const colorMode = event.target.value as MachineLearningColorMode;
            this.props.onChangeColorMode(colorMode);
        }
    }

    private static renderLoading(): JSX.Element {
        return <>
            <div className="sstc-spinner-container">
                <div className="sstc-spinner-inner-container">
                    <Spinner size={SpinnerSize.XLarge}/>
                </div>
            </div>
        </>
    }

    private handleColorChange = (name: MachineLearningLabel) => (color: ColorDef) => {
        this.props.onLabelColorChange(color, name);
    }

    private renderTable(): JSX.Element {

        const autoSaveEnabled = this.state.timerVar !== undefined;

        const onlyShowPresent = true;

        const tableRows: JSX.Element[] = [];
        let allLabelVisible = true;
        let allLabelHidden = true;
        let allLabelTransparent = true;
        let allLabelOpaque = true;
        let anyLabelSelected = false;
        let allPredictionVisible = true;
        let allPredictionHidden = true;
        let allPredictionTransparent = true;
        let allPredictionOpaque = true;
        let anyPredictionSelected = false;

        for (const item of this.props.itemMap.values()) {
            if (!item.trueLabelIsDisplayed) {
                allLabelVisible = false;
            } else {
                allLabelHidden = false;
            }
            if (!item.trueLabelIsTransparent) {
                allLabelTransparent = false;
            } else {
                allLabelOpaque = false;
            }
            if (item.trueLabelSelectedCount !== 0) {
                anyLabelSelected = true;
            }
            if (!item.predLabelIsDisplayed) {
                allPredictionVisible = false;
            } else {
                allPredictionHidden = false;
            }
            if (!item.predLabelIsTransparent) {
                allPredictionTransparent = false;
            } else {
                allPredictionOpaque = false;
            }
            if (item.predLabelSelectedCount !== 0) {
                anyPredictionSelected = true;
            }
        }

        const processItem = (item: MLStateTableDataItem, level: number, isExpanded: boolean, hasChildren: boolean) => {

            if (!onlyShowPresent || FORCE_ALL || item.hasData) {

                let iconClass = "icon-line";
                if (hasChildren) {
                    if (isExpanded) {
                        iconClass = "icon-caret-down";
                    } else {
                        iconClass = "icon-caret-right";
                    }
                }

                const i18nName = IModelApp.i18n.translate(item.name);

                const trueDisplayedCount = anyLabelSelected ? item.trueLabelSelectedCount : item.trueLabelTotalCount;
                const predDisplayedCount = anyPredictionSelected ? item.predLabelSelectedCount : item.predLabelTotalCount;

                if (this.state.filterEmptyRows === false || trueDisplayedCount !== 0 || predDisplayedCount !== 0) {

                    tableRows.push(
                        <tr key={'table-row-' + item.name}>
                            <td className="mltc-name-td" style={{whiteSpace: "nowrap"}}>
                                <div className="mltc-level-spacer" style={{minWidth: 16 * level}}/>
                                <Button
                                    className="mltc-expand-button" style={{minWidth: 80, maxWidth: 80}}
                                    onClick={() => {
                                        this.props.onLabelExpandStateChange(!isExpanded, item.name);
                                    }}
                                >
                                    <Icon iconSpec={iconClass}/>
                                </Button>
                                <div className="mltc-label-container">
                                    {i18nName}
                                </div>
                                <ColorPickerButton
                                    className="sstc-color-picker-button"
                                    initialColor={item.color}
                                    onColorPick={this.handleColorChange(item.name)}
                                />
                            </td>
                            <td className="mltc-label-td">
                                <AppearanceToggleComponent
                                    transparencyAvailable={true}
                                    label={i18nName}
                                    itemId={item.name}
                                    visible={item.trueLabelIsDisplayed}
                                    transparent={item.trueLabelIsTransparent}
                                    onClick={this.props.onLabelDisplayChange}/>
                                <GroupSelectButtonComponent
                                    label={i18nName}
                                    itemId={item.name}
                                    hilite={item.trueLabelSelectedCount !== 0}
                                    onClick={this.props.onLabelSelectionClick}/>
                                <AssignLabelButton label={i18nName} name={item.name}
                                                   onClick={this.props.onLabelApply}/>
                                <div className="sstc-count-container">
                                    {trueDisplayedCount}
                                </div>
                            </td>
                            <td className="mltc-prediction-td">
                                <AppearanceToggleComponent
                                    transparencyAvailable={true}
                                    label={i18nName}
                                    itemId={item.name}
                                    visible={item.predLabelIsDisplayed}
                                    transparent={item.predLabelIsTransparent}
                                    onClick={this.props.onPredictionDisplayChange}
                                />
                                <GroupSelectButtonComponent
                                    label={i18nName}
                                    itemId={item.name}
                                    hilite={item.predLabelSelectedCount !== 0}
                                    onClick={this.props.onPredictionSelectionClick}/>
                                <div className="sstc-count-container">
                                    {predDisplayedCount}
                                </div>
                            </td>
                        </tr>
                    );
                }
            }
        }

        const _recurse = (treeItem: LabelTreeEntry) => {
            const item = this.props.itemMap.get(treeItem.name);
            if (item === undefined) {
                return;
            }
            processItem(item, treeItem.level, treeItem.isExpanded, treeItem.children.length !== 0);
            if (treeItem.isExpanded) {
                for (const child of treeItem.children) {
                    _recurse(child);
                }
            }
        }

        for (const entry of this.props.labelTree) {
            _recurse(entry);
        }

        const colorModeOptions: JSX.Element[] = [];
        for (const colorMode of this.props.availableColorModes) {
            const colorModeI18n = IModelApp.i18n.translate(colorMode);
            colorModeOptions.push(
                <option key={`color-mode-option-${colorMode}`} value={colorMode}>{colorModeI18n}</option>
            );
        }

        return <>

            <div className="sstc-data-container">
                <table className="sstc-data-table">
                    <thead>
                    <tr>
                        <th className="mltc-name-th">Name</th>
                        <th className="mltc-label-th">Label</th>
                        <th className="mltc-prediction-th">Prediction</th>
                    </tr>
                    <tr>
                        <td className="mltc-name-td">
                            <div className="mltc-label-container">
                                <LabeledToggle
                                    className="sstc-hide-empty-toggle"
                                    label="Hide Empty"
                                    isOn={this.state.filterEmptyRows}
                                    onChange={this.handleToggleFilter}
                                />
                            </div>
                            <Button
                                className="sstc-swap-button"
                                buttonType={ButtonType.Hollow}
                                onClick={this.props.onSwapTruePredDisplay}
                            >
                                <Icon iconSpec="icon-replace"/>
                            </Button>
                        </td>
                        <td className="mltc-label-td">
                            <AppearanceBatchToggleComponent
                                transparencyAvailable={true}
                                allHidden={allLabelHidden}
                                allVisible={allLabelVisible}
                                allTransparent={allLabelTransparent}
                                allOpaque={allLabelOpaque}
                                onClick={
                                    (newVisible: boolean, newTransparent: boolean) => {
                                        this.props.onLabelDisplayChange(newVisible, newTransparent, undefined);
                                    }
                                }
                            />
                            <GroupSelectButtonComponent label={IModelApp.i18n.translate("LabelerState.everything")}
                                                        onClick={() => {
                                                            this.props.onLabelSelectionClick(undefined);
                                                        }}/>
                        </td>
                        <td className="mltc-prediction-td">
                            <AppearanceBatchToggleComponent
                                transparencyAvailable={true}
                                allHidden={allPredictionHidden}
                                allVisible={allPredictionVisible}
                                allTransparent={allPredictionTransparent}
                                allOpaque={allPredictionOpaque}
                                onClick={
                                    (newVisible: boolean, newTransparent: boolean) => {
                                        this.props.onPredictionDisplayChange(newVisible, newTransparent, undefined);
                                    }
                                }
                            />
                            <GroupSelectButtonComponent label={IModelApp.i18n.translate("LabelerState.everything")}
                                                        onClick={() => {
                                                            this.props.onPredictionSelectionClick(undefined);
                                                        }}/>
                        </td>
                    </tr>
                    </thead>
                    <tbody>
                    {tableRows}
                    </tbody>
                </table>
            </div>
            {/* <div className="sstc-options-container">
                <LabeledToggle
                    label="Filter Empty Rows"
                    isOn={this.state.filterEmptyRows}
                    onChange={this.handleToggleFilter}
                />
            </div> */}
            <div className="sstc-color-mode-container">
                <label className="sstc-color-mode-label">
                    {IModelApp.i18n.translate("LabelerState:colorMode")}
                    <select
                        className="sstc-color-mode-select"
                        value={this.props.currentColorMode}
                        onChange={this.handleColorModeChange}
                    >
                        {colorModeOptions}
                    </select>
                </label>
            </div>
            <div className="sstc-action-container">
                <Button className="sstc-control-button" onClick={this.props.onSave} disabled={!this.props.isDirty}><Icon
                    iconSpec="icon-save"/></Button>&nbsp;
                <div className="sstc-action-container-expand">
                    <LabeledToggle
                        label={`Auto Save (${MINUTES} min.)`}
                        isOn={autoSaveEnabled}
                        onChange={this.handleAutoSaveToggle}
                    />
                </div>
                <Button className="sstc-control-button" onClick={this.props.onUndo} disabled={!this.props.canUndo}><Icon
                    iconSpec="icon-undo"/></Button>&nbsp;
                <Button className="sstc-control-button" onClick={this.props.onRedo} disabled={!this.props.canRedo}><Icon
                    iconSpec="icon-redo"/></Button>&nbsp;
            </div>
        </>;
    }

    private handleToggleFilter = (enable: boolean) => {
        this.setState({filterEmptyRows: enable});
    }

    private handleAutoSaveToggle = (enable: boolean) => {
        if (enable) {
            if (this.state.timerVar !== undefined) {
                clearInterval(this.state.timerVar);
            }
            const timerVar = setInterval(this.props.onSave, MINUTES * 60000);
            this.setState({
                timerVar: timerVar,
            })
        } else {
            if (this.state.timerVar !== undefined) {
                clearInterval(this.state.timerVar);
            }
            this.setState({
                timerVar: undefined,
            })
        }
    }

    public render() {
        return <>
            {!this.props.ready && MLStateTableComponent.renderLoading()}
            {this.props.ready && this.renderTable()}
        </>;
    }
}

