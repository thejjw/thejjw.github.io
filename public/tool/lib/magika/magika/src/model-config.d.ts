import { ContentTypeLabel } from "./content-type-label.js";
export declare class ModelConfig {
    beg_size: number;
    mid_size: number;
    end_size: number;
    use_inputs_at_offsets: boolean;
    medium_confidence_threshold: number;
    min_file_size_for_dl: number;
    padding_token: number;
    block_size: number;
    target_labels_space: ContentTypeLabel[];
    thresholds: Partial<Record<ContentTypeLabel, number>>;
    overwrite_map: Partial<Record<ContentTypeLabel, ContentTypeLabel>>;
    loaded: boolean;
    loadUrl(configURL: string): Promise<void>;
    protected setConfig(config: Record<string, any>): void;
}
