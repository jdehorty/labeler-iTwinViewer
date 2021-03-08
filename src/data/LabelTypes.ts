import { Id64String, Id64Arg } from "@bentley/bentleyjs-core";
import { ColorDef } from "@bentley/imodeljs-common";

export enum MachineLearningColorMode {
    Native = "MachineLearning:colorMode.native",
    LabelColors = "MachineLearning:colorMode.labelColors",
    PredictionColors = "MachineLearning:colorMode.predictionColors",
    ConfusionsWithLabelColors = "MachineLearning:colorMode.confusionsWithLabelColors",
    ConfusionsWithPredictionColors = "MachineLearning:colorMode.confusionsWithPredictionColors",
}

export type MachineLearningLabel = string;

export interface MachineLearningLabelDef {
    label: MachineLearningLabel;
    defaultColor?: ColorDef;
    parentLabel?: MachineLearningLabel;
    userLabelShown?: boolean;
    modelPredictionShown?: boolean;
}

export interface LabelDefinitions {
    unlabeledValue: MachineLearningLabel;
    labelDefMap: Map<MachineLearningLabel, MachineLearningLabelDef>;
}

export interface LabelActivation {
    label: MachineLearningLabel;
    activation: number;
}

export interface ModelPrediction {
    label: MachineLearningLabel;
    labelActivations?: LabelActivation[];
    auxData?: any;
}

export type UserLabelMap = Map<Id64String, MachineLearningLabel>;
export type ModelPredictionMap = Map<Id64String, ModelPrediction>;

export abstract class MachineLearningLabelInterface {
    public abstract getLabelDefinitions(): Promise<LabelDefinitions>;
    public abstract getUserLabels(ids: Id64Arg): Promise<UserLabelMap>;
    public abstract setUserLabels(labelMap: UserLabelMap): Promise<boolean>;
    // public abstract patchUserLabels(partialLabelMap: Map<Id64String, MachineLearningLabel>): Promise<boolean>;
    public abstract getModelPredictions(ids: Id64Arg): Promise<ModelPredictionMap>;
}
