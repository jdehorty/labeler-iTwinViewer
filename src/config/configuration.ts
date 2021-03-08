/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
import {Config} from "@bentley/bentleyjs-core";

/**
 * Setup config for the application. Limited to the in-memory configuration for the app.
 */
export function SetupConfigFromEnv(regionCode: number = 103) {
    Config.App.merge({
        imjs_buddi_resolve_url_using_region: regionCode,
        oidc_client_id: process.env.IMJS_OIDC_CLIENT_ID,
        oidc_authority: process.env.IMJS_AUTHORITY,
        mlAccountName: process.env.IMJS_ACCOUNT_NAME,
        mlSasString: process.env.IMJS_SAS_STRING,
        mlProjectGuid: process.env.IMJS_CONTEXT_ID,
        mlIModelGuid: process.env.IMJS_IMODEL_ID,
        mlIModelName: "",
        mlChangeSetId: "",
        mlPredSuffix: process.env.IMJS_PREDICTION_PREFIX
    });

}

