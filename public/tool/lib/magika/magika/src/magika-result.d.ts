import { MagikaPrediction } from "./magika-prediction.js";
import { Status } from "./status.js";
export interface MagikaResult {
    path: string;
    status: Status;
    prediction: MagikaPrediction;
}
