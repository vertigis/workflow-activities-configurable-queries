import { CodedValue, Domain, SearchField } from "./interfaces";
import {
    isDateRangeRef,
    isDateTimeRef,
    isFilesRef,
    isGeometryRef,
    isItemsRef,
    isNumberRef,
    isScanRef,
} from "@vertigis/workflow/forms/utils";
import { defs } from "@vertigis/workflow/forms/FormHost";

export function formatDateRange(value: defs.Value): string | undefined {
    if (isDateRangeRef(value)) {
        const values = [value.startDate, value.endDate];
        return `DATE '${values[0].toISOString().split("T")[0]}' AND DATE '${values[1].toISOString().split("T")[0]
            }'`;
    }
    return undefined;
}

export function formatDate(value: defs.Value): string | undefined {
    if (isDateTimeRef(value)) {
        return `TIMESTAMP '${new Date(value.value)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ")}'`;
    }
    return undefined;
}

export function formatItems(
    value: defs.Value,
): Array<unknown> | undefined {
    let formattedValue;
    if (isItemsRef(value)) {
        formattedValue = value.items.map((x) => `${x.value as any}`);
    }

    return formattedValue;
}

export function formatNumberRange(value: defs.Value): string | undefined {
    let formattedValue;

    if (Array.isArray(value) && value.length === 2) {
        formattedValue = `${value[0]} AND ${value[1]}`;
    }
    return formattedValue;
}

export function getFormValue(formElement: defs.Element,
    queryField: SearchField): any {
    const hasValue = formElement.value || formElement.value === 0;

    if (hasValue) {
        const currentValue =
            formElement.type === "CheckBox"
                ? (Number(formElement.checked) as defs.Value)
                : (formElement.value as defs.Value);
        if (isDateRangeRef(currentValue)) {
            return formatDateRange(currentValue);
        } else if (isDateTimeRef(currentValue)) {
            return formatDate(currentValue);
        } else if (formElement.type === "NumberRangeSlider") {
            return formatNumberRange(currentValue);
        } else if (isItemsRef(currentValue)) {
            return formatItems(currentValue);
        } else if (isNumberRef(currentValue)) {
            return currentValue.numeric.toString();
        } else if (
            isGeometryRef(currentValue) ||
            isFilesRef(currentValue) ||
            isScanRef(currentValue)
        ) {
            throw new Error(
                `Unsupported form element value: ${queryField.field}: ${(currentValue as any).type
                }`,
            );
        }
        return currentValue;
    }
}

export function getValueIgnoringCase<T>(
    keyName: string,
    dictionary: Record<string, T>,
): T | undefined {
    const key = getKeyIgnoringCase(keyName, dictionary);
    if (key) return dictionary[key];
}
export function getKeyIgnoringCase<T>(
    keyName: string,
    dictionary: Record<string, T>,
): string | undefined {
    return Object.keys(dictionary).find((k) =>
        equalsIgnoreCase(keyName, k),
    );
}

export function equalsIgnoreCase(str1: string, str2: string): boolean {
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

export function getCodedValues(
    layer:
        | __esri.FeatureLayer
        | __esri.SubtypeGroupLayer
        | __esri.SubtypeSublayer
        | __esri.Sublayer,
    fieldName: string,
    typeCode?: number,
): CodedValue[] | undefined {
    if (!layer || !fieldName) {
        return;
    }
    let typedLayer: __esri.FeatureLayer | __esri.SubtypeGroupLayer | __esri.Sublayer;
    let code: number | undefined;
    if (layer.type === "subtype-sublayer") {
        typedLayer = layer.parent;
        code = layer.subtypeCode;
    } else {
        typedLayer = layer;
        code = typeCode;
    }
    const sourceJSON: __esri.FeatureLayer = typedLayer.sourceJSON;
    if (sourceJSON.subtypeField?.toLocaleLowerCase() ===
        fieldName.toLocaleLowerCase()) {
        if (sourceJSON.subtypes) {
            return sourceJSON.subtypes;
        }
    }
    const domain = getDomain(sourceJSON, fieldName, code);
    return domain?.codedValues;
}

export function getDomain(
    layerInfo: __esri.FeatureLayer | __esri.Sublayer,
    fieldName: string,
    code?: number
): Domain | undefined {
    if (!layerInfo || !fieldName) {
        return;
    }

    let typeInfo: __esri.Subtype | __esri.FeatureType | undefined;

    if (layerInfo.type === "feature" && layerInfo.subtypes) {
        typeInfo = layerInfo.subtypes.find(
            (subtype) => subtype.code === code,
        );
    } else if (layerInfo.types) {
        typeInfo = layerInfo.types.find((type) => type.id === code);
    }
    if (typeInfo) {
        const domains = typeInfo?.domains;
        if (domains) {
            const domain = getValueIgnoringCase(
                fieldName,
                domains,
            ) as Domain;
            if (
                domain?.codedValues &&
                domain.codedValues instanceof Array
            ) {
                return domain;
            }
        }
    }
    return getFieldDomain(layerInfo, fieldName);
}

export function getFieldDomain(
    layerInfo: __esri.FeatureLayer | __esri.SubtypeGroupLayer | __esri.Sublayer,
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

export function getDefinitionExpression(
    layer:
        | __esri.FeatureLayer
        | __esri.SubtypeGroupLayer
        | __esri.SubtypeSublayer
        | __esri.Sublayer
): string | undefined {
    let expression;
    switch (layer.type) {
        case "subtype-sublayer":
            expression = layer.parent.definitionExpression
                ? `${layer.parent.definitionExpression} AND ${layer.parent.subtypeField} = ${layer.subtypeCode}`
                : `${layer.parent.subtypeField} = ${layer.subtypeCode}`;
            break;
        case "subtype-group":
        case "feature":
        case "sublayer":
            expression = layer.definitionExpression;
            break;
    }

    return expression;
}