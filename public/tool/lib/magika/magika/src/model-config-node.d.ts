import { ModelConfig } from "./model-config.js";
export declare class ModelConfigNode extends ModelConfig {
    loadFile(configPath: string): Promise<void>;
}
