export declare class ModelFeatures {
    beg_ints: Uint16Array;
    end_ints: Uint16Array;
    locked: {
        beg: boolean;
        end: boolean;
    };
    constructor(beg_size: number, mid_size: number, end_size: number, padding_token: number, use_inputs_at_offsets: boolean);
    withStart(data: Uint8Array, offset: number): this;
    withEnd(data: Uint8Array, offset: number): this;
    toArray(): number[];
}
