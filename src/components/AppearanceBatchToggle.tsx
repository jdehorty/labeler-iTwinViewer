import { IModelApp } from "@bentley/imodeljs-frontend";
import { Button, ButtonType, Icon } from "@bentley/ui-core";
import * as React from "react";
import '../styles/LabelingWorkflowStyles.scss';

/** GroupVisiblityButton properties */
export interface AppearanceBatchToggleComponentProps {
    /** Label for flyover (not translated internally) */
    label?: string;
    /** Set if transparency is available */
    transparencyAvailable: boolean;
    /** Are all items visible? */
    allVisible: boolean;
    /** Are all items hidden? */
    allHidden: boolean;
    /** Are all items transparent? */
    allTransparent: boolean;
    /** Are all items opaque? */
    allOpaque: boolean;
    /** Click handler */
    onClick?(newVisible: boolean, newTransparent: boolean): void;
}

/** Button that shows/changes the visibility status of a group of items (that may have different statuses) */
export class AppearanceBatchToggleComponent extends React.PureComponent<AppearanceBatchToggleComponentProps> {
    public render() {
        let newVisible: boolean;
        let newTransparent: boolean;
        let labelToggleClass: string;
        let labelToggleIconSpec: string;
        if (this.props.allVisible && this.props.allOpaque) {
            labelToggleClass = "on";
            labelToggleIconSpec = "icon-visibility";
            if (this.props.transparencyAvailable) {
                newVisible = true;
                newTransparent = true;
            } else {
                newVisible = false;
                newTransparent = false;
            }
        } else if (this.props.allVisible && this.props.allTransparent) {
            labelToggleClass = "transparent";
            labelToggleIconSpec = "icon-isolate";
            newVisible = false;
            newTransparent = false;
        } else if (this.props.allHidden) {
            labelToggleClass = "off";
            labelToggleIconSpec = "icon-visibility-hide-2";
            newVisible = true;
            newTransparent = false;
        } else {
            labelToggleClass = "mixed";
            // labelToggleIconSpec = "icon-visibility-semi-transparent";
            labelToggleIconSpec = "icon-more";
            newVisible = false;
            newTransparent = false;
        }

        let title = IModelApp.i18n.translate(newVisible ? "LabelerState.show" : "LabelerState.hide");
        title += ": ";
        title += (this.props.label ? this.props.label : "");
        return <>
            <Button
                title={title}
                buttonType={ButtonType.Blue}
                className={"sstc-visibility-button " + labelToggleClass}
                onClick={() => {
                        if (this.props.onClick !== undefined) {
                            this.props.onClick(newVisible, newTransparent);
                        }
                    }
                }
            >
                <Icon iconSpec={labelToggleIconSpec} />
            </Button>
        </>
    }
}
