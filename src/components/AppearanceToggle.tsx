import { IModelApp } from "@bentley/imodeljs-frontend";
import { Button, ButtonType, Icon } from "@bentley/ui-core";
import * as React from "react";
import '../styles/LabelingWorkflowStyles.scss';

/** TristateVisiblityButton properties */
interface AppearanceToggleComponentProps<ItemT> {
    /** Label for flyover (not translated internally) */
    label?: string;
    /** Set if transparency is available */
    transparencyAvailable: boolean;
    /** Item reference */
    itemId?: ItemT;
    /** Is this item visible? */
    visible: boolean;
    /** Is this item transparent? */
    transparent: boolean;
    /** Click handler */
    onClick?(newVisible: boolean, newTransparent: boolean, itemId?: ItemT): void;
}

/** Button that shows/changes the visibility status of an item */
export class AppearanceToggleComponent<ItemT> extends React.PureComponent<AppearanceToggleComponentProps<ItemT>> {
    public render() {
        let newVisible: boolean;
        let newTransparent: boolean;
        let actionI18nKey: string;
        let buttonClassName: string;
        let iconSpec: string;
        if (this.props.visible && !this.props.transparent) {
            if (this.props.transparencyAvailable) {
                newVisible = true;
                newTransparent = true;
            } else {
                newVisible = false;
                newTransparent = false;
            }
            actionI18nKey = "LabelerState:makeTransparent";
            buttonClassName = "sstc-visibility-button on";
            iconSpec = "icon-visibility";
        } else if (this.props.visible && this.props.transparent) {
            newVisible = false;
            newTransparent = false;
            actionI18nKey = "LabelerState:hide";
            buttonClassName = "sstc-visibility-button transparent";
            iconSpec = "icon-isolate";
        } else {
            newVisible = true;
            newTransparent = false;
            actionI18nKey = "LabelerState:show";
            buttonClassName = "sstc-visibility-button off";
            iconSpec = "icon-visibility-hide-2";
        }

        let title = IModelApp.i18n.translate(actionI18nKey);
        title += ": ";
        title += (this.props.label ? this.props.label : "");
        return <>
            <Button
                    title={title}
                    buttonType={ButtonType.Blue}
                    className={buttonClassName}
                    onClick={()=>{
                        if (this.props.onClick !== undefined) {
                            this.props.onClick(newVisible, newTransparent, this.props.itemId);
                        }
                    }}
                >
                    <Icon iconSpec={iconSpec} />
            </Button>
        </>
    }
}
