import type { IActivityHandler } from "@vertigis/workflow";
import { getCodedValues } from "./utils";

export interface GetLayerCodedValuesInputs {
    /**
     * @description The layer containing coded value domains.
     * @required
     */
    layer:
    | __esri.FeatureLayer
    | __esri.SubtypeGroupLayer
    | __esri.SubtypeSublayer;

    /**
     * @description The field used to look up the coded value.
     * @required
     */
    field: string;

    /**
     * @description: The type or subtype code to apply to the lookup (optional).
     */
    typeCode?: number;
}

export interface GetLayerCodedValuesOutputs {
    /**
     * @description A list of Coded Values.
     */
    result: __esri.CodedValue[] | undefined;
}

/**
 * @category Configurable Queries
 * @description Gets coded value domain for a feature layer field
 * @clientOnly
 * @supportedApps EXB, GWV
 */
export default class GetLayerCodedValues implements IActivityHandler {
    execute(inputs: GetLayerCodedValuesInputs): GetLayerCodedValuesOutputs {
        const { field, layer, typeCode } = inputs;
        if (!layer) {
            throw new Error("layer is required");
        }
        if (!field) {
            throw new Error("field is required");
        }
        return {
            result: getCodedValues(layer, field, typeCode),
        };
    }   
}
