import type { IActivityHandler } from "@vertigis/workflow";
import { CodedValue, Domain } from "./interfaces";

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
    typeCode?: number
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
        const { field, layer, typeCode} = inputs;
        if (!layer) {
            throw new Error("layer is required");
        }
        if (!field) {
            throw new Error("field is required");
        }
        
        return { result: GetLayerCodedValues.getCodedValues(layer, field, typeCode) }

    }

    static getCodedValues(layer: __esri.FeatureLayer | __esri.SubtypeGroupLayer | __esri.SubtypeSublayer, fieldName: string, typeCode?: number): CodedValue[] | undefined {
        if (!layer || !fieldName) {
            return;
        }

        let layerInfo: __esri.FeatureLayer | __esri.SubtypeGroupLayer;
        let code = typeCode;
        if(layer.type === "subtype-sublayer") {
            layerInfo = layer.parent.sourceJSON;
            code = layer.subtypeCode;
        } else {
            layerInfo = layer.sourceJSON;
            code = typeCode;
        }
        const isSubtypeField = layerInfo.subtypeField?.toLocaleLowerCase() === fieldName.toLocaleLowerCase();
        if (isSubtypeField) {
            return layerInfo.subtypes;
        }
        const domain =this.getDomain(layerInfo, fieldName, code);
        return domain?.codedValues;
    }
    
    private static getDomain(layerInfo: __esri.FeatureLayer | __esri.SubtypeGroupLayer, fieldName: string, code?:number): Domain | undefined {
        if (!layerInfo || !fieldName) {
            return;
        }


        // we first check on the level of the subtype if we can find a domain configuration
        
        if (layerInfo.type === "subtype-group" && code) {
            const subtypeInfo = layerInfo.subtypes?.find((subtype) => subtype.code === code);
            const domains = subtypeInfo?.domains;
            if (domains) {
                const domain = this.getValueIgnoringCase(
                    fieldName,
                    domains,
                ) as Domain;
                if (domain && domain.codedValues instanceof Array) {
                    return domain;
                }
            }
        } else if ((layerInfo as __esri.FeatureLayer).types && code) {
            const typeInfo = (layerInfo as __esri.FeatureLayer).types.find((type) => type.id === code);
            const domains = typeInfo?.domains;
            if(domains){
                const domain = this.getValueIgnoringCase(fieldName, domains) as Domain;
                if(domain?.codedValues && domain.codedValues instanceof Array) {
                    return domain;
                }
            }
        }

        // then we continue on the level of the layerInfo
        return this.getFieldDomain(layerInfo, fieldName);
    }

    private static getFieldDomain(
        layerInfo: __esri.FeatureLayer | __esri.SubtypeGroupLayer,
        fieldName: string,
    ): Domain | undefined {
        const fields = layerInfo.fields;
        if (fields instanceof Array) {
            const field = fields.find(
                (f) => f.name.toLowerCase() === fieldName.toLowerCase(),
            );
            const domain = field?.domain as Domain;
            if (domain && domain.codedValues instanceof Array) {
                return domain;
            }
        }
    }

    private static getValueIgnoringCase<T>(
        keyName: string,
        dictionary: Record<string, T>,
    ): T | undefined {
        const key = this.getKeyIgnoringCase(keyName, dictionary);
        if (key) return dictionary[key];
    }
    private static getKeyIgnoringCase<T>(
        keyName: string,
        dictionary: Record<string, T>,
    ): string | undefined {
        return Object.keys(dictionary).find((k) =>
            this.equalsIgnoreCase(keyName, k),
        );
    }

    private static equalsIgnoreCase(str1: string, str2: string): boolean {
        if (str1 === str2) {
            // Start with the easiest case.
            // This also covers both being null or undefined.
            return true;
        }
        if (str1 === null || str1 === undefined) {
            // One is null or undefined.
            return false;
        }
        if (str2 === null || str2 === undefined) {
            // The other is null or undefined.
            return false;
        }
        return str1.toLowerCase() === str2.toLowerCase();
    }
}
