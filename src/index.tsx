import "./styles/index.scss";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import {LabelerState} from "./store/LabelerState";

// App startup
LabelerState.init();
console.log("Completed LabelerState.startup");

ReactDOM.render(<App />, document.getElementById("root"));

serviceWorker.unregister();