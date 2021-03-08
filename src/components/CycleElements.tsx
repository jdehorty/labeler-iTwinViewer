import {IModelApp} from "@bentley/imodeljs-frontend";
import {Button, Icon, ButtonType} from "@bentley/ui-core";
import * as React from "react";
import '../styles/LabelingWorkflowStyles.scss';
import MLTablePortal from "./MLTablePortal";

export interface CycleElementComponentProps {
    ready: boolean;
    enabled: boolean;
    working: boolean;
    cycleSetSize?: number;
    cycleIndex?: number;
    poppedOut?: boolean;
    totalCount: number;
    selectedCount: number;
    forceShowAll: boolean;

    onStart(): void;

    onStop(): void;

    onPopout(): void;

    onForward(count: number): void;

    onBackward(count: number): void;

    onForceShowAllChanged(forceShowAll: boolean): void;
}

interface CycleElementComponentState {
    readyForPopup: boolean;
}


export class CycleElementComponent extends React.Component<CycleElementComponentProps, CycleElementComponentState> {

    constructor(props: CycleElementComponentProps) {
        super(props);

        this.state = {
            readyForPopup: false
        };

        this._onButtonClick = this._onButtonClick.bind(this);

    }

    _onButtonClick = () => {
        this.setState({
            readyForPopup: true,
        });
    }

    _onWindowClose = () => {
        this.setState({
            readyForPopup: false,
        });
    }

    public render() {

        let fastCount = 1;
        if (this.props.cycleSetSize !== undefined) {
            fastCount = Math.round(this.props.cycleSetSize / 10);
            if (fastCount < 1) {
                fastCount = 1;
            }
        }

        return (
            <>
                <div className="sstc-data-header">
                    <table className="sstc-cycler-table">
                        <tbody>
                        <tr>
                            <td>
                                <Button
                                    className="sstc-isolate-button"
                                    buttonType={ButtonType.Hollow}
                                >
                                    <Icon iconSpec="icon-isolate"/>
                                </Button>
                            </td>
                            <td>
                                <div className="vertical-rule"/>
                            </td>

                            <td>
                                <Button className="cycler-button" disabled={this.props.working || !this.props.ready}
                                        onClick={() => this.props.onBackward(-1)}>
                                    <Icon iconSpec="icon-media-controls-frame-backward"/>
                                </Button>

                                <Button className="cycler-previous" buttonType={ButtonType.Hollow}>
                                    Previous
                                </Button>
                            </td>

                            {/*TODO: Get counter working again */}
                            <td>
                                <div className="cycler-progress">
                                    <div
                                        className="cycler-title">{IModelApp.i18n.translate("LabelerState:cycler.cyclingTitle")}</div>
                                    <div className="cycler-value">
                                        {this.props.cycleIndex !== undefined && <>
                                            {`${this.props.cycleIndex! + 1}`}
                                            &nbsp;/&nbsp;
                                        </>}
                                        {`${this.props.cycleSetSize!}`}
                                    </div>
                                </div>
                            </td>

                            <td>
                                <Button className="cycler-next" buttonType={ButtonType.Hollow}>
                                    Next
                                </Button>
                                <Button className="cycler-button"
                                        disabled={this.props.working || !this.props.ready}
                                        onClick={() => this.props.onForward(1)}>
                                    <Icon iconSpec="icon-media-controls-frame-forward"/>
                                </Button>
                            </td>

                            <td>
                                <div className="vertical-rule"/>
                            </td>
                            <td>
                                <Button className="sstc-window-new-button"
                                        buttonType={ButtonType.Hollow}
                                        onClick={this._onButtonClick}
                                >
                                    <Icon iconSpec="icon-window-new"/>
                                </Button>

                                {
                                    this.state.readyForPopup && <MLTablePortal title={"ML Audit"} closeWindow={this._onWindowClose}/>
                                }
                            </td>

                        </tr>
                        </tbody>
                    </table>
                    <hr/>
                </div>
            </>
        );
    }

}

