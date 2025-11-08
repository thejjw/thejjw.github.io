import { ContentTypeInfo } from "./content-type-info.js";
import { ContentTypeLabel } from "./content-type-label.js";
export type ContentTypesInfos = Record<ContentTypeLabel, ContentTypeInfo>;
export declare const ContentTypesInfos: {
    get: () => ContentTypesInfos;
};
