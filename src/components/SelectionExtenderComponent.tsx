/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import {Id64String} from "@bentley/bentleyjs-core";
import {IModelApp} from "@bentley/imodeljs-frontend";
import {Button, ButtonType, LabeledInput, LabeledSelect, LabeledToggle} from "@bentley/ui-core";
import * as React from "react";
import {MatchingOperator, SelectionExtenderConfig, MatchingRuleType} from "../store/SelectionExtenderTypes";
import {NumberInputComponent} from "./NumberInputComponent";
import '../styles/SelectionExtenderComponent.scss';

export interface SelectionExtenderComponentProps {
    singleId?: Id64String;
    contentMap?: Map<MatchingRuleType, string[]>;
    foundCount?: number;
    isSearching?: boolean;
    config?: SelectionExtenderConfig;

    onConfigChanged(newConfig: SelectionExtenderConfig): void;

    onExtendClicked(): void;

    onResetClicked(): void;
}

export class SelectionHelperComponent extends React.Component<SelectionExtenderComponentProps> {
    constructor(props: SelectionExtenderComponentProps) {
        super(props);
        this.state = {
        };
    }

    private handleFieldCheckboxClicked = (i: number) => (event: React.MouseEvent<HTMLInputElement, MouseEvent>): void => {
        if (this.props.config === undefined) {
            return;
        }
        const newChildRules = Array.from(this.props.config.rule.childRules);
        newChildRules[i].wanted = !newChildRules[i].wanted;
        this.props.onConfigChanged({
            ...this.props.config,
            rule: {
                ...this.props.config.rule,
                childRules: newChildRules,
            }
        });
    };

    private handleMaxDistEnabledClicked = (checked: boolean): void => {
        if (this.props.config === undefined) {
            return;
        }
        this.props.onConfigChanged({
            ...this.props.config,
            maxDistEnabled: checked,
        });
    };


    private handleMaxDistValueValidated = (value: number): void => {
        if (this.props.config === undefined) {
            return;
        }
        this.props.onConfigChanged({
            ...this.props.config,
            maxDistValue: value,
        });
    }

    private handleMaxCountEnabledClicked = (checked: boolean): void => {
        if (this.props.config === undefined) {
            return;
        }
        this.props.onConfigChanged({
            ...this.props.config,
            maxCountEnabled: checked,
        });
    };


    private handleMaxCountValueValidated = (value: number): void => {
        if (this.props.config === undefined) {
            return;
        }
        this.props.onConfigChanged({
            ...this.props.config,
            maxCountValue: value,
        });
    }

    private handleAuxDataClicked = (checked: boolean): void => {
        if (this.props.config === undefined) {
            return;
        }
        this.props.onConfigChanged({
            ...this.props.config,
            enableAuxData: checked,
        });
    };

    private handleOperatorChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        if (this.props.config === undefined) {
            return;
        }
        this.props.onConfigChanged({
            ...this.props.config,
            rule: {
                ...this.props.config.rule,
                // TODO: make this safer
                operator: event.target.value as MatchingOperator,
            }
        });
    }

    public render() {


        const singleId = this.props.singleId;

        // create list of checkboxes
        const checkboxElements: JSX.Element[] = [];
        if (this.props.config !== undefined) {
            const childRules = this.props.config.rule.childRules;
            for (let i = 0; i < childRules.length; i++) {
                if (this.props.contentMap!.has(childRules[i].type)) {
                    const content = this.props.contentMap!.get(childRules[i].type)!;
                    checkboxElements.push(
                        <div key={`childRule-${i}`} className="selhelp-criteria">
                            <div className="selhelp-criteria-checkbox-container">
                                <input className="selhelp-criteria-checkbox" type="checkbox"
                                       checked={childRules[i].wanted} onClick={this.handleFieldCheckboxClicked(i)}/>
                            </div>
                            <div className="selhelp-criteria-content">
                                <div className="selhelp-criteria-title">
                                    {IModelApp.i18n.translate(childRules[i].type)}
                                </div>
                                {content.map((value: string) => {
                                    return <>
                                        <div className="selhelp-criteria-value">
                                            {value}
                                        </div>
                                    </>
                                })}
                            </div>
                        </div>
                    );
                }
            }
        }

        return (
            <>
                {this.props.isSearching && "Searching..."}
                {this.props.foundCount !== undefined && !this.props.isSearching && `Found ${this.props.foundCount} elements`}
                <LabeledInput readOnly label="Select Elements Similar to Id:"
                              value={singleId !== undefined ? singleId : ""}/>
                <div>
                    <Button buttonType={ButtonType.Primary} onClick={this.props.onExtendClicked}>Extend
                        Selection</Button>
                    <Button buttonType={ButtonType.Blue} onClick={this.props.onResetClicked}>Reset</Button>
                </div>
                {this.props.config !== undefined && <div className="scroll-thing">
                    <LabeledToggle
                        isOn={this.props.config.enableAuxData}
                        label="Mesh-Derived Data"
                        onChange={this.handleAuxDataClicked}
                    />
                    <LabeledToggle
                        isOn={this.props.config.maxDistEnabled}
                        label="Maximum Distance"
                        onChange={this.handleMaxDistEnabledClicked}
                    />
                    {
                        this.props.config.maxDistEnabled &&
                        <NumberInputComponent
                            isFloat={true}
                            value={this.props.config.maxDistValue}
                            minValue={0.0}
                            onValidated={this.handleMaxDistValueValidated}
                        />
                    }
                    <LabeledToggle
                        isOn={this.props.config.maxCountEnabled}
                        label="Maximum Count"
                        onChange={this.handleMaxCountEnabledClicked}
                    />
                    {
                        this.props.config.maxCountEnabled &&
                        <NumberInputComponent
                            isFloat={false}
                            value={this.props.config.maxCountValue}
                            minValue={1}
                            onValidated={this.handleMaxCountValueValidated}
                        />
                    }
                    {checkboxElements}
                    <LabeledSelect
                        label="Reduction Operator"
                        // TODO: make this safer
                        options={[MatchingOperator.And, MatchingOperator.Or]}
                        value={this.props.config.rule.operator}
                        onChange={this.handleOperatorChange}
                    />
                </div>}

                {this.props.config === undefined && "Loading..."}

                {/* <CycleElementComponent /> */}
            </>
        );
    }

}

