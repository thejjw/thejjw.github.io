import { ContentTypesInfos } from "./src/content-types-infos.js";
import { MagikaOptions } from "./src/magika-options.js";
import { MagikaResult } from "./src/magika-result.js";
import { ModelConfig } from "./src/model-config.js";
import { ModelFeatures } from "./src/model-features.js";
import { Model } from "./src/model.js";
/**
 * The main Magika object for client-side use.
 *
 * Example usage:
 * ```js
 * const file = new File(["# Hello I am a markdown file"], "hello.md");
 * const fileBytes = new Uint8Array(await file.arrayBuffer());
 * const magika = await Magika.create();
 * const result = await magika.identifyBytes(fileBytes);
 * console.log(result.prediction.output.label);
 * ```
 * For a Node implementation, please import `MagikaNode` instead.
 *
 * Demos:
 * - Node: `<MAGIKA_REPO>/js/magika-cli.js`, which you can run with `yarn run bin -h`.
 * - Client-side: see `<MAGIKA_REPO>/website/src/components/FileClassifierDemo.vue`
 */
export declare class Magika {
    model_config: ModelConfig;
    model: Model;
    model_name: string;
    cts_infos: ContentTypesInfos;
    static MODEL_VERSION: string;
    static MODEL_CONFIG_URL: string;
    static MODEL_URL: string;
    static WHITESPACE_CHARS: number[];
    protected constructor();
    /**
     * Factory method to create a Magika instance.
     *
     * @param {MagikaOptions} options The urls or file paths where the model and
     * its config are stored.
     *
     * Parameters are optional. If not provided, the model will be loaded from GitHub.
     */
    static create(options?: MagikaOptions): Promise<Magika>;
    protected load(options?: MagikaOptions): Promise<void>;
    /**
     * Identifies the content type of a byte array.
     *
     * @param {Uint8Array} fileBytes A fixed-length sequence of bytes.
     * @returns {MagikaResult} An object containing the result of the content type
     * prediction.
     */
    identifyBytes(fileBytes: Uint8Array): Promise<MagikaResult>;
    getModelName(): string;
    private _getResultFromFewBytes;
    private static _lstrip;
    private static _rstrip;
    protected _identifyFromBytes(fileBytes: Uint8Array): Promise<MagikaResult>;
    private _getOutputLabelFromModelPrediction;
    protected static _extractFeaturesFromBytes(fileBytes: Uint8Array, beg_size: number, mid_size: number, end_size: number, padding_token: number, block_size: number, use_inputs_at_offsets: boolean): ModelFeatures;
    private _getContentTypeInfo;
    private _getResultFromLabelsAndScore;
    private _getResultFromFeatures;
    protected _getModelName(pathOrUrl: string): string;
}
