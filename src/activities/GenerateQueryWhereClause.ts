import type { IActivityHandler } from "@vertigis/workflow";
import { DisplayFormOutputs } from "@vertigis/workflow/activities/forms/DisplayForm";
import {
    isDateRangeRef,
    isDateTimeRef,
    isFilesRef,
    isGeometryRef,
    isItemsRef,
    isNumberRef,
    isScanRef
} from "@vertigis/workflow/forms/utils";
import { defs } from "@vertigis/workflow/forms/FormHost";
import { EsriFieldType, SearchField as QueryField } from "./interfaces";

export interface GenerateWhereClauseInputs {
    /**
     * @description The target Layer to apply the clause.
     * @required
     */
    layer: __esri.FeatureLayer | __esri.SubtypeGroupLayer | __esri.SubtypeSublayer;
    /**
     * @description The form used to collect the query inputs.
     * @required
     */
    targetForm: DisplayFormOutputs;
    /**
     * @description The query fields and operators used to create the where clause.  Field and Form Element Names must match.
     * @required
     */
    queryFields: QueryField[];
    /**
    * @description An existing where clause (optional).  The dynamic query clause will be appended.
    */
    whereClause?: string;
}

export interface GenerateWhereClauseOutputs {
    /**
     * @description The result of the activity.
     */
    result: string | undefined;
}


/**
 * @category Configurable Queries
 * @description Creates a where clause from a query form.
 * @clientOnly
 * @supportedApps EXB, GWV
 **/
export default class GenerateWhereClause implements IActivityHandler {

    execute(inputs: GenerateWhereClauseInputs): GenerateWhereClauseOutputs {
        const { layer, targetForm, whereClause, queryFields } = inputs
        if (!layer) {
            throw new Error("layer is required");
        }
        if (!targetForm) {
            throw new Error("targetForm is required");
        }
        if (!queryFields) {
            throw new Error("queryFields is required");
        }

        let where = whereClause && whereClause.length > 0 ? whereClause : "1=1";
        const definitionExpression = this.getDefinitionExpression(layer);
        if (definitionExpression) {
            where = `${where} AND ${definitionExpression}`;
        }
        let fields: __esri.Field[];
        if (layer.type === "subtype-sublayer") {
            fields = layer.parent.fields;
        } else {
            fields = layer.fields;
        }
        return {
            result: this.setSQLValues(targetForm, where, fields, queryFields),
        };
    }

    private setSQLValues(targetForm: DisplayFormOutputs,
        where: string,
        fields: __esri.Field[],
        searchFields: QueryField[]): string | undefined {

        for (const key of Object.keys(targetForm.state)) {
            const formElement = targetForm.state[key];
            const field = fields.find(x => x.name === key);
            if (field) {
                const searchField = searchFields.find(x => x.field == key);
                if (searchField) {
                    const value = this.setQueryValue(formElement, searchField, field);
                    if (value) {
                        where = this.appendToWhere(where, searchField, value);
                    }
                }
            }

        }
        return where;
    }

    private setQueryValue(formElement: defs.Element, queryField: QueryField, field: __esri.Field): string | undefined {
        const hasValue = formElement.value || formElement.value === 0;

        if (hasValue) {
            const currentValue = formElement.type === "CheckBox" ? Number(formElement.checked) as defs.Value : formElement.value as defs.Value;
            if (isDateRangeRef(currentValue)) {
                return this.formatDateRange(currentValue);
            } else if (isDateTimeRef(currentValue)) {
                return this.formatDate(currentValue);
            } else if (formElement.type === "NumberRangeSlider") {
                return this.formatNumberRange(currentValue);
            } else if (isItemsRef(currentValue)) {
                return this.formatItems(currentValue, field);
            } else if (isNumberRef(currentValue)) {
                return currentValue.numeric.toString();
            } else if (isGeometryRef(currentValue) || isFilesRef(currentValue) || isScanRef(currentValue)) {
                throw new Error(`Unsupported form element value: ${queryField.field}: ${(currentValue as any).type}`);
            }
            return this.formatValue(currentValue, queryField, field);
        }
        return undefined;

    }

    private appendToWhere(where: string, queryFields: QueryField, inValue: string) {
        let fieldAndValue = "";
        let value = inValue;
        if (queryFields.operator === "IN") {
            value = `(${value})`
        }
        fieldAndValue = ` AND ${queryFields.field} ${queryFields.operator} ${value}`;

        return `${where}${fieldAndValue}`
    }
    private formatValue(value: defs.Value, searchField: QueryField, field: __esri.Field): string | undefined {
        let formattedValue;
        switch (field.type) {
            case EsriFieldType.Guid:
            case EsriFieldType.GlobalId:
            case EsriFieldType.String:
                if (searchField.operator.toUpperCase() === "LIKE") {
                    formattedValue = `%${value as any}%`;
                } else {
                    formattedValue = `'${value as any}'`;
                }
                break;
            default:
                formattedValue = `${value as any}`;
                break;
        }
        return formattedValue;
    }




    private getDefinitionExpression(layer: __esri.FeatureLayer | __esri.SubtypeGroupLayer | __esri.SubtypeSublayer): string | undefined {
        let expression;
        switch (layer.type) {
            case "subtype-sublayer":
                expression = layer.parent.definitionExpression ?
                    `${layer.parent.definitionExpression} AND ${layer.parent.subtypeField} = ${layer.subtypeCode}` :
                    `${layer.parent.subtypeField} = ${layer.subtypeCode}`;
                break;
            case "subtype-group":
            case "feature":
                expression = layer.definitionExpression;
                break;
        }

        return expression;

    }


    private formatDateRange(value: defs.Value): string | undefined {

        if (isDateRangeRef(value)) {
            const values = [value.startDate, value.endDate];
            return `DATE '${values[0].toISOString().split('T')[0]}' AND DATE '${values[1].toISOString().split('T')[0]}'`;
        }
        return undefined;
    }

    private formatDate(value: defs.Value): string | undefined {

        if (isDateTimeRef(value)) {
            return `TIMESTAMP '${new Date(value.value).toISOString().slice(0, 19).replace('T', ' ')}'`;
        }
        return undefined;
    }


    private formatItems(value: defs.Value, field: __esri.Field): string | undefined {
        let formattedValue;
        if (isItemsRef(value)) {
            switch (field.type) {
                case "guid":
                case "global-id":
                case "string":
                    formattedValue = value.items.map(x => `'${x.value as any}'`).join(",");
                    break;
                default:
                    formattedValue = value.items.map(x => `${x.value as any}`).join(",");
                    break;
            }
        }
        return formattedValue;
    }

    private formatNumberRange(value: defs.Value): string | undefined {
        let formattedValue;

        if (Array.isArray(value) && value.length === 2) {
            formattedValue = `${value[0]} AND ${value[1]}`;
        }
        return formattedValue;
    }
}
