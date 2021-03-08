import { GuidString, Id64, Id64Arg, Id64String } from "@bentley/bentleyjs-core";
import { ColorDef } from "@bentley/imodeljs-common";
import { downloadBlobAsString, uploadBlobAsString } from "./blobs";
import { LabelActivation, LabelDefinitions, MachineLearningLabel, MachineLearningLabelDef, MachineLearningLabelInterface, ModelPrediction } from "./LabelTypes";
import { decToHex, hexToDec } from "../utils/dectohex";


export interface BlobBasedLabelDataSourceConfig {
    accountName: string;
    sasString: string;
    projectGuid: GuidString;
    imodelGuid: GuidString;
    imodelName: string;
    revisionId: string;
    predSuffix: string;
}

interface MachineLearningLabelDefExt extends MachineLearningLabelDef {
    legacyName: string;
}

export class BlobBasedMachineLearningLabelInterface extends MachineLearningLabelInterface {

    private UNLABELED: MachineLearningLabel = "MachineLearning:label.unlabeled";

    private NO_PREDICTION: ModelPrediction = {
        label: this.UNLABELED,
        labelActivations: [
            { label: this.UNLABELED, activation: 1.0 }
        ],
    };

    private LABEL_DEFS: Array<MachineLearningLabelDefExt> = [
        { label: "MachineLearning:label.beam", legacyName: "Beam", parentLabel: "MachineLearning:label.beam", defaultColor: ColorDef.from(64, 64, 64) },
        { label: "MachineLearning:label.brace", legacyName: "Brace", parentLabel: "MachineLearning:label.beam", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.bracevertical", legacyName: "BraceVertical", parentLabel: "MachineLearning:label.column", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.bracehorizontal", legacyName: "BraceHorizontal", parentLabel: "MachineLearning:label.beam", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.column", legacyName: "Column", parentLabel: "MachineLearning:label.column", defaultColor: ColorDef.from(128, 128, 128) },
        { label: "MachineLearning:label.concretepile", legacyName: "ConcretePile", parentLabel: "MachineLearning:label.pile", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.curtainwall", legacyName: "CurtainWall", parentLabel: "MachineLearning:label.wall", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.curtainwallwindow", legacyName: "CurtainWallWindow", parentLabel: "MachineLearning:label.window", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.door", legacyName: "Door", parentLabel: "MachineLearning:label.door", defaultColor: ColorDef.from(170, 110, 40) },
        { label: "MachineLearning:label.hatch", legacyName: "Hatch", parentLabel: "MachineLearning:label.door", defaultColor: ColorDef.from(170, 110, 40) },
        { label: "MachineLearning:label.floor", legacyName: "Floor", parentLabel: "MachineLearning:label.slab", defaultColor: ColorDef.from(70, 240, 240) },
        { label: "MachineLearning:label.footing", legacyName: "Footing", parentLabel: "MachineLearning:label.slab", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.manhole", legacyName: "ManHole", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.mullion", legacyName: "Mullion", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.other", legacyName: "Other", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(145, 30, 180) },
        { label: "MachineLearning:label.pile", legacyName: "Pile", parentLabel: "MachineLearning:label.pile", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.pilecap", legacyName: "PileCap", parentLabel: "MachineLearning:label.slab", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.pipe", legacyName: "Pipe", parentLabel: "MachineLearning:label.pipe", defaultColor: ColorDef.from(60, 180, 75) },
        { label: "MachineLearning:label.railing", legacyName: "Railing", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.slab", legacyName: "Slab", parentLabel: "MachineLearning:label.slab", defaultColor: ColorDef.from(0, 128, 128) },
        { label: "MachineLearning:label.space", legacyName: "Space", parentLabel: "MachineLearning:label.space", defaultColor: ColorDef.from(230, 190, 255, 150) },
        { label: "MachineLearning:label.stair", legacyName: "Stair", parentLabel: "MachineLearning:label.stair", defaultColor: ColorDef.from(255, 25, 75) },
        { label: "MachineLearning:label.timberjoist", legacyName: "TimberJoist", parentLabel: "MachineLearning:label.beam", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.timberstud", legacyName: "TimberStud", parentLabel: "MachineLearning:label.column", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.wall", legacyName: "Wall", parentLabel: "MachineLearning:label.wall", defaultColor: ColorDef.from(255, 255, 25) },
        { label: "MachineLearning:label.window", legacyName: "Window", parentLabel: "MachineLearning:label.window", defaultColor: ColorDef.from(0, 0, 128, 128) },
        { label: "MachineLearning:label.wire", legacyName: "Wire", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.annotation", legacyName: "Annotation", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.ground", legacyName: "Ground", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(0, 128, 0) },
        { label: "MachineLearning:label.terrain", legacyName: "Terrain", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(0, 128, 0) },
        { label: "MachineLearning:label.earthwork", legacyName: "Earthwork", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(0, 128, 0) },
        { label: "MachineLearning:label.soil", legacyName: "Soil", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(0, 128, 0) },
        { label: "MachineLearning:label.drainagepipe", legacyName: "DrainagePipe", parentLabel: "MachineLearning:label.pipe", defaultColor: ColorDef.from(64, 128, 64) },
        { label: "MachineLearning:label.drainagestructure", legacyName: "DrainageStructure", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(0, 128, 255) },
        { label: "MachineLearning:label.streetsign", legacyName: "StreetSign", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(192, 0, 0) },
        { label: "MachineLearning:label.trafficlight", legacyName: "TrafficLight", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(192, 0, 0) },
        { label: "MachineLearning:label.pavement", legacyName: "Pavement", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(0, 0, 0) },
        { label: "MachineLearning:label.pavementmarkings", legacyName: "PavementMarkings", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(255, 128, 0) },
        { label: "MachineLearning:label.curbs", legacyName: "Curbs", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(64, 64, 64) },
        { label: "MachineLearning:label.firehydrant", legacyName: "FireHydrant", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(255, 0, 0) },
        { label: "MachineLearning:label.utilitypole", legacyName: "UtilityPole", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(165, 42, 42) },
        { label: "MachineLearning:label.mailbox", legacyName: "Mailbox", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(192, 192, 192) },
        { label: "MachineLearning:label.duct", legacyName: "Duct", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(192, 192, 192) },
        { label: "MachineLearning:label.ramp", legacyName: "Ramp", parentLabel: "MachineLearning:label.slab", defaultColor: ColorDef.from(192, 192, 192) },
        { label: "MachineLearning:label.roof", legacyName: "Roof", parentLabel: "MachineLearning:label.slab", defaultColor: ColorDef.from(0, 128, 128) },
        { label: "MachineLearning:label.fastener", legacyName: "Fastener", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(192, 192, 192) },
        { label: "MachineLearning:label.partialobject", legacyName: "PartialObject", parentLabel: "MachineLearning:label.excluded", defaultColor: ColorDef.from(255, 255, 255) },
        { label: "MachineLearning:label.excluded", legacyName: "Excluded", parentLabel: "MachineLearning:label.excluded", defaultColor: ColorDef.from(255, 255, 255) },
        { label: "MachineLearning:label.placeholder1", legacyName: "PlaceHolder1", parentLabel: "MachineLearning:label.unlabeled", defaultColor: ColorDef.from(255, 255, 255) },
        { label: "MachineLearning:label.placeholder2", legacyName: "PlaceHolder2", parentLabel: "MachineLearning:label.unlabeled", defaultColor: ColorDef.from(255, 255, 255) },
        { label: "MachineLearning:label.placeholder3", legacyName: "PlaceHolder3", parentLabel: "MachineLearning:label.unlabeled", defaultColor: ColorDef.from(255, 255, 255) },
        { label: "MachineLearning:label.placeholder4", legacyName: "PlaceHolder4", parentLabel: "MachineLearning:label.unlabeled", defaultColor: ColorDef.from(255, 255, 255) },
        { label: "MachineLearning:label.unmapped", legacyName: "Unmapped", parentLabel: "MachineLearning:label.unlabeled", defaultColor: ColorDef.from(255, 255, 255) },
        { label: "MachineLearning:label.notext", legacyName: "NoText", parentLabel: "MachineLearning:label.unlabeled", defaultColor: ColorDef.from(255, 255, 255) },
        { label: "MachineLearning:label.misclassified", legacyName: "Misclassified", parentLabel: "MachineLearning:label.misclassified", defaultColor: ColorDef.from(255, 0, 0) },
        { label: "MachineLearning:label.beammisclassified", legacyName: "BeamMisclassified", parentLabel: "MachineLearning:label.beam", defaultColor: ColorDef.from(255, 0, 0) },
        { label: "MachineLearning:label.columnmisclassified", legacyName: "ColumnMisclassified", parentLabel: "MachineLearning:label.column", defaultColor: ColorDef.from(255, 0, 0) },
        { label: "MachineLearning:label.slabmisclassified", legacyName: "SlabMisclassified", parentLabel: "MachineLearning:label.slab", defaultColor: ColorDef.from(255, 0, 0) },
        { label: "MachineLearning:label.doormisclassified", legacyName: "DoorMisclassified", parentLabel: "MachineLearning:label.door", defaultColor: ColorDef.from(255, 0, 0) },
        { label: "MachineLearning:label.windowmisclassified", legacyName: "WindowMisclassified", parentLabel: "MachineLearning:label.window", defaultColor: ColorDef.from(255, 0, 0) },
        { label: "MachineLearning:label.othermisclassified", legacyName: "OtherMisclassified", parentLabel: "MachineLearning:label.other", defaultColor: ColorDef.from(255, 0, 0) },
        { label: "MachineLearning:label.stairmisclassified", legacyName: "StairMisclassified", parentLabel: "MachineLearning:label.stair", defaultColor: ColorDef.from(255, 0, 0) },
        { label: "MachineLearning:label.wallmisclassified", legacyName: "WallMisclassified", parentLabel: "MachineLearning:label.wall", defaultColor: ColorDef.from(255, 0, 0) },
        { label: "MachineLearning:label.pipemisclassified", legacyName: "PipeMisclassified", parentLabel: "MachineLearning:label.pipe", defaultColor: ColorDef.from(255, 0, 0) },
        { label: "MachineLearning:label.spacemisclassified", legacyName: "SpaceMisclassified", parentLabel: "MachineLearning:label.space", defaultColor: ColorDef.from(255, 0, 0) },
        { label: "MachineLearning:label.pilemisclassified", legacyName: "PileMisclassified", parentLabel: "MachineLearning:label.pile", defaultColor: ColorDef.from(255, 0, 0) },



        { label: this.UNLABELED, legacyName: "Unlabeled", parentLabel: this.UNLABELED, defaultColor: ColorDef.from(255, 255, 255) },
    ];


    private _config: BlobBasedLabelDataSourceConfig;

    constructor(config: BlobBasedLabelDataSourceConfig) {
        super();
        this._config = config;
    }

    private async _download_model_predictions(): Promise<Map<Id64String, ModelPrediction>> {

        const containerName = "abce-predictions";
        if (this._config.predSuffix !== "") {
            this._config.predSuffix = `-${this._config.predSuffix}`
        }
        const blobName = `${this._config.projectGuid}_${this._config.imodelGuid}_${this._config.revisionId}_instance-predictions${this._config.predSuffix}.json`;

        const predictionMap = new Map<Id64String, ModelPrediction>();
        try {
            const blobData = await downloadBlobAsString(this._config.accountName, this._config.sasString, containerName, blobName);
            if (blobData !== undefined) {
                const data = JSON.parse(blobData);
                for (const instancePred of data.instancePredictions) {
                    const elementId: Id64String = instancePred.DgnElementIdHex.toLowerCase();
                    const modelPrediction: ModelPrediction = {
                        label: "MachineLearning:label." + instancePred.ElementName.toLowerCase(),
                        auxData: instancePred.AuxData,
                    }
                    if (instancePred.Probabilities !== undefined) {
                        const labelActivations: LabelActivation[] = [];
                        for (const elementProb of instancePred.Probabilities) {
                            labelActivations.push({
                                label: "MachineLearning:label." + elementProb.ElementName.toLowerCase(),
                                activation: elementProb.Probability,
                            });
                        }
                        modelPrediction.labelActivations = labelActivations;
                    }
                    predictionMap.set(elementId, modelPrediction);
                }
            }
        } catch (e) {
            console.groupCollapsed("Failed to download predictions");
            console.trace();
            console.log(e);
            console.log(containerName);
            console.log(blobName);
            console.groupEnd();
        }
        return predictionMap;
    }


    private async _download_user_labels(): Promise<Map<Id64String, MachineLearningLabel>> {

        const containerName = "abce-misclassification-labels";

        const blobName = `${this._config.projectGuid}_${this._config.imodelGuid}_${this._config.revisionId}_misclassification-labels-jkd.csv`;

        const instanceMap = new Map<Id64String, MachineLearningLabel>();

        try {
            const blobData = await downloadBlobAsString(this._config.accountName, this._config.sasString, containerName, blobName);

            if (blobData !== undefined) {
                const a = blobData.split("\n");
                if (a.length >= 1) {
                    a.shift();
                    a.forEach((line: string) => {
                        const items = line.split(",");
                        if (items.length >= 2) {
                            const elementId = decToHex(items[0])!.toLowerCase();
                            const label = items[1].startsWith("MachineLearning:label") ? items[1] : "MachineLearning:label." + items[1].toLowerCase();
                            instanceMap.set(elementId, label);
                        }
                    });
                }
            }
        }
        catch (e) {
            try {
                //if _misclassified-labels.csv not present, try to load the standard labels.csv from the alternate source (geometry labels):
                const altContainerName = "abce-labels";
                const altBlobName = `${this._config.projectGuid}_${this._config.imodelGuid}_${this._config.revisionId}_labels.csv`;
                const blobData = await downloadBlobAsString(this._config.accountName, this._config.sasString, altContainerName, altBlobName);

                if (blobData !== undefined) {
                    const a = blobData.split("\n");
                    if (a.length >= 1) {
                        a.shift();
                        a.forEach((line: string) => {
                            const items = line.split(",");
                            if (items.length >= 2) {
                                const elementId = decToHex(items[0])!.toLowerCase();
                                const label = items[1].startsWith("MachineLearning:label") ? items[1] : "MachineLearning:label." + items[1].toLowerCase();
                                instanceMap.set(elementId, label);
                            }
                        });
                    }
                }
            }

            catch (e) {
                console.groupCollapsed("Failed to download the alternate labels");
                console.trace();
                console.log(e);
                console.log(containerName);
                console.log(blobName);
                console.groupEnd();
            }
        }



        return instanceMap;
    }

    private async _upload_user_labels(labelMap: Map<Id64String, MachineLearningLabel>): Promise<boolean> {

        const labelLegacyMap = new Map<MachineLearningLabel, string>();
        for (const labelDef of this.LABEL_DEFS) {
            labelLegacyMap.set(labelDef.label, labelDef.legacyName);
        }

        const containerName = "abce-misclassification-labels";
        const blobName = `${this._config.projectGuid}_${this._config.imodelGuid}_${this._config.revisionId}_misclassification-labels-jkd.csv`;
        const contentLines: string[] = [",bentley_class_name,method,probability"];
        for (const [id, label] of labelMap) {
            const legacyName = labelLegacyMap.has(label) ? labelLegacyMap.get(label) : "Unlabeled";
            contentLines.push(`${hexToDec(id)},${legacyName},imodeljs_labeler,1.00`);
        }
        const content = contentLines.join("\n");
        try {
            return uploadBlobAsString(this._config.accountName, this._config.sasString, containerName, blobName, content);
        } catch (e) {
            console.groupCollapsed("Failed to upload labels");
            console.trace();
            console.log(e);
            console.log(containerName);
            console.log(blobName);
            console.groupEnd();
            return false;
        }
    }

    public async getLabelDefinitions(): Promise<LabelDefinitions> {
        const labelDefMap = new Map<MachineLearningLabel, MachineLearningLabelDef>();
        for (const labelDef of this.LABEL_DEFS) {
            labelDefMap.set(labelDef.label, labelDef);
        }
        return {
            unlabeledValue: this.UNLABELED,
            labelDefMap: labelDefMap,
        };
    }

    public async getUserLabels(ids: Id64Arg): Promise<Map<Id64String, MachineLearningLabel>> {
        const downloadedLabelMap = await this._download_user_labels();
        const outputLabelMap = new Map<Id64String, MachineLearningLabel>();
        Id64.toIdSet(ids).forEach((id) => {
            if (downloadedLabelMap.has(id)) {
                outputLabelMap.set(id, downloadedLabelMap.get(id)!);
            } else {
                outputLabelMap.set(id, this.UNLABELED);
            }
        });
        return outputLabelMap;
    }

    public async setUserLabels(labelMap: Map<Id64String, MachineLearningLabel>): Promise<boolean> {
        return this._upload_user_labels(labelMap);
    }

    public async getModelPredictions(ids: Id64Arg): Promise<Map<Id64String, ModelPrediction>> {
        const downloadedPredictionMap = await this._download_model_predictions();
        const outputPredictionMap = new Map<Id64String, ModelPrediction>();
        Id64.toIdSet(ids).forEach((id) => {
            if (downloadedPredictionMap.has(id)) {
                outputPredictionMap.set(id, downloadedPredictionMap.get(id)!);
            } else {
                outputPredictionMap.set(id, this.NO_PREDICTION);
            }
        });
        return outputPredictionMap;
    }
}


