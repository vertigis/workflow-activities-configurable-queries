import type { IActivityHandler } from "@vertigis/workflow";
import { DisplayFormOutputs } from "@vertigis/workflow/activities/forms/DisplayForm";
import { defs } from "@vertigis/workflow/forms/FormHost";
import { EsriFieldType, SearchField as QueryField } from "./interfaces";
import { getDefinitionExpression, getFormValue } from "./utils";

export interface GenerateWhereClauseInputs {
    /**
     * @description The target Layer to apply the clause.
     * @required
     */
    layer:
    | __esri.FeatureLayer
    | __esri.SubtypeGroupLayer
    | __esri.SubtypeSublayer;
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
        const { layer, targetForm, whereClause, queryFields } = inputs;
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
        const definitionExpression = getDefinitionExpression(layer);
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

    private setSQLValues(
        targetForm: DisplayFormOutputs,
        where: string,
        fields: __esri.Field[],
        searchFields: QueryField[],
    ): string | undefined {
        for (const key of Object.keys(targetForm.state)) {
            const formElement = targetForm.state[key];
            const field = fields.find((x) => x.name === key);
            if (field) {
                const searchField = searchFields.find((x) => x.field == key);
                if (searchField) {
                    const value = this.setQueryValue(
                        formElement,
                        searchField,
                        field,
                    );
                    if (value) {
                        where = this.appendToWhere(where, searchField, value);
                    }
                }
            }
        }
        return where;
    }

    private setQueryValue(
        formElement: defs.Element,
        queryField: QueryField,
        field: __esri.Field,
    ): string | undefined {
        const currentValue = getFormValue(formElement, queryField);
        if (currentValue) {
            return this.formatValue(currentValue, queryField, field);
        }
        return undefined;
    }


    private appendToWhere(
        where: string,
        queryFields: QueryField,
        inValue: string,
    ) {
        let fieldAndValue = "";
        let value = inValue;
        if (queryFields.operator === "IN") {
            value = `(${value})`;
        }
        fieldAndValue = ` AND ${queryFields.field} ${queryFields.operator} ${value}`;

        return `${where}${fieldAndValue}`;
    }
    private formatValue(
        value: any,
        searchField: QueryField,
        field: __esri.Field,
    ): string | undefined {
        let formattedValue;
        switch (field.type) {
            case EsriFieldType.Guid:
            case EsriFieldType.GlobalId:
            case EsriFieldType.String:
                if (Array.isArray(value)) {
                    formattedValue = value.map(x => `'${x}'`).join(",");
                } else if (searchField.operator.toUpperCase() === "LIKE") {
                    formattedValue = `%${value}%`;
                } else {
                    formattedValue = `'${value}'`;
                }
                break;
            default:
                if (Array.isArray(value)) {
                    formattedValue = value.join(",");
                } else {
                    formattedValue = `${value}`;
                }
                break;
        }
        return formattedValue;
    }
}
