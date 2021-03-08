import { IModelApp } from "@bentley/imodeljs-frontend";
import { Button, Icon } from "@bentley/ui-core";
import * as React from "react";
import '../styles/LabelingWorkflowStyles.scss';

/** SelectionButton properties */
export interface GroupSelectButtonComponentProps<ItemT> {
    /** Label for flyover (not translated internally) */
    label?: string;
    /** Item reference */
    itemId?: ItemT;
    /** Hilite */
    hilite?: boolean;
    /** Click handler */
    onClick?(itemId?: ItemT): void;
}

/** Button to select an item */
export class GroupSelectButtonComponent<ItemT> extends React.PureComponent<GroupSelectButtonComponentProps<ItemT>> {
    public render() {
        let title = IModelApp.i18n.translate("LabelerState:select");
        title += ": ";
        title += (this.props.label ? this.props.label : "");
        let className = "sstc-select-button";
        if (this.props.hilite !== undefined) {
            className += " " + (this.props.hilite ? "on" : "off");
        }
        return <>
            <Button
                title={title}
                className={className}
                onClick={() => {
                    if (this.props.onClick !== undefined) {
                        this.props.onClick(this.props.itemId);
                    }
                }}
            ><Icon iconSpec="icon-selection" /></Button>
        </>
    }
}
