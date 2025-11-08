import { GraphModel } from "@tensorflow/tfjs";
import { ModelConfig } from "./model-config.js";
import { ModelPrediction } from "./model-prediction.js";
import { ModelFeatures } from "./model-features.js";
export declare class Model {
    model_config: ModelConfig;
    model?: GraphModel;
    constructor(model_config: ModelConfig);
    loadUrl(modelURL: string): Promise<void>;
    predict(features: ModelFeatures): Promise<ModelPrediction>;
}
