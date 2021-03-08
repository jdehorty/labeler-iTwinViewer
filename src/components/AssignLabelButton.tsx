import { IModelApp } from "@bentley/imodeljs-frontend";
import { Button, Icon } from "@bentley/ui-core";
import * as React from "react";
import '../styles/LabelingWorkflowStyles.scss';

export interface AssignLabelButtonProps<ItemT> {
    label?: string;
    name: ItemT;
    onClick?(name: ItemT): void;
}

export class AssignLabelButton<ItemT> extends React.PureComponent<AssignLabelButtonProps<ItemT>> {

    public render() {
        let title = IModelApp.i18n.translate("LabelerState:assignLabel");
        title += ": ";
        title += (this.props.label ? this.props.label : "");
        return <>
            <Button
                title={title}
                className="sstc-select-button"
                onClick={() => {
                    if (this.props.onClick !== undefined) {
                        this.props.onClick(this.props.name);
                    }
                }}
            ><Icon iconSpec="icon-tag-2" /></Button>
        </>
    }
}
