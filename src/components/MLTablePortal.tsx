import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from "react-redux";
import {LabelerState} from "../store/LabelerState";
import {ConnectedMLTableComponent} from "./ConnectedMLTable";
import {copyStyles} from "../utils/CopyStyles";

interface Props {
    title: string;                          // The title of the popout window
    closeWindow: () => void;                // Callback to close the popout
}

interface State {
    externalWindow: Window | null;          // The popout window
    containerElement: HTMLElement | null;   // The root element of the popout window
}

export default class MLTablePortal extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            externalWindow: null,
            containerElement: null
        };
    }

    // When we create this component, open a new window
    public componentDidMount() {
        const features = 'width=800, height=500, left=300, top=200';
        const externalWindow = window.open('', '', features);

        let containerElement = null;
        if (externalWindow) {
            containerElement = externalWindow.document.createElement('div');
            externalWindow.document.body.appendChild(containerElement);

            // Copy the app's styles into the new window
            copyStyles(externalWindow.document, document);

            externalWindow.document.title = this.props.title;

            // Make sure the window closes when the component unloads
            externalWindow.addEventListener('beforeunload', () => {
                this.props.closeWindow();
            });
        }

        this.setState({
            externalWindow: externalWindow,
            containerElement: containerElement
        });
    }

// Make sure the window closes when the component unmounts
    public componentWillUnmount() {
        if (this.state.externalWindow) {
            this.state.externalWindow.close();
        }
    }

    public render() {
        if (!this.state.containerElement) {
            return null;
        }

        let wrappedWidget =
            <div>
                <Provider store={LabelerState.store}>
                    <ConnectedMLTableComponent/>
                </Provider>
            </div>;

        // Render this component's children into the root element of the popout window
        return ReactDOM.createPortal(wrappedWidget, this.state.containerElement);
    }
}