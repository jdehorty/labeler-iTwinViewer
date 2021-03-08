/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import * as React from "react";
import { Input } from "@bentley/ui-core";


interface NumberInputComponentProps {
    isFloat: boolean;
    value: number;
    minValue?: number;
    maxValue?: number;
    onValidated(value: number): void;
}

interface NumberInputComponentState {
    valueAsString: string;
}

export class NumberInputComponent extends React.Component<NumberInputComponentProps, NumberInputComponentState> {

    constructor(props: NumberInputComponentProps) {
        super(props);

        this.state = {
            valueAsString: props.value.toString(),
        };
    }


    private handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({valueAsString: event.target.value})
    }

    private _processValue() {

        let newValue = parseFloat(this.state.valueAsString);
        if (!this.props.isFloat) {
            newValue = Math.round(newValue);
        }
        let isValid = true;
        if (isNaN(newValue) || 
            (this.props.minValue !== undefined && newValue < this.props.minValue) ||
            (this.props.maxValue !== undefined && newValue > this.props.maxValue)) 
        {
            isValid = false;
        } 
        if (!isValid) {
            this.setState({valueAsString: this.props.value.toString()});
        } else {
            this.setState({valueAsString: newValue.toString()});
            this.props.onValidated(newValue);
        }
    }

    private handleBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
        this._processValue();
    }

    
    private handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if ((event.keyCode === 13 || event.key === 'Enter')) {
            this._processValue();
        }
    }

    public render() {


        return (
            <>
                <Input
                    type="number"
                    value={this.state.valueAsString}
                    onChange={this.handleChange}
                    onBlur={this.handleBlur}
                    onKeyPress={this.handleKeyPress}
                />
            </>
        );
    }

}

