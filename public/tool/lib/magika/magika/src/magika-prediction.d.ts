import { ContentTypeInfo } from "./content-type-info.js";
import { ContentTypeLabel } from "./content-type-label.js";
import { OverwriteReason } from "./overwrite-reason.js";
export interface MagikaPrediction {
    dl: ContentTypeInfo;
    output: ContentTypeInfo;
    score: number;
    overwrite_reason: OverwriteReason;
    scores_map?: Partial<Record<ContentTypeLabel, number>>;
}
