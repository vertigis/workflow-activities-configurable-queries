import type { IActivityHandler } from "@vertigis/workflow";
import * as defs from "@vertigis/workflow/forms/FormDefinition";
import { DisplayFormOutputs } from "@vertigis/workflow/activities/forms/DisplayForm";
import { IActivityContext } from "@vertigis/workflow/IActivityHandler";
import { SetFormElementEvent } from "@vertigis/workflow/activities/forms/SetFormElementEvent";
import { AddFormElement } from "@vertigis/workflow/activities/forms/AddFormElement";
import { GetFormElementItemsFromFeatures } from "@vertigis/workflow/activities/arcgis/GetFormElementItemsFromFeatures";
import { GetFormElementItemsFromCollection } from "@vertigis/workflow/activities/forms/GetFormElementItemsFromCollection";
import { SetCurrentFormElementItem } from "@vertigis/workflow/activities/forms/SetCurrentFormElementItem";
import { SetFormElementItemProperty } from "@vertigis/workflow/activities/forms/SetFormElementItemProperty";
import { SetFormElementItems } from "@vertigis/workflow/activities/forms/SetFormElementItems";
import { Lookup } from "@vertigis/workflow/Collections";
import { ElementValue, SearchField } from "./interfaces";
import { isDataRef, isDateRangeRef, isDateTimeRef, isItemsRef, isNumberRef } from "@vertigis/workflow/forms/utils";
import GenerateWhereClause from "./GenerateQueryWhereClause";
import Query from "@arcgis/core/rest/support/Query";
import GetLayerCodedValues from "./GetLayerCodedValues";

export interface QueryProperties {
    /**
     * @description The Query configuration.
     * @required
     */
    searchFields: SearchField[];

    /**
     * @description The form used to collect the query inputs.
     * @required
     */
    form: DisplayFormOutputs;

    /**
     * @description The target Feature Layer to execute the query against.
     * @required
     */

    layer: __esri.FeatureLayer | __esri.SubtypeGroupLayer | __esri.SubtypeSublayer;
    /**
     * @description The title of the Query Form.
     * @required
     */

    title: string;

    /**
    * @description The description of the Query Form (optional).
    * @required
    */
    description?: string;

    /**
     * @description A where to append to the result (optional).
     */
    where?: string;
}


interface AddQueryOutputs {
    /**
     * @description The target form.
     */
    result: DisplayFormOutputs;
}

/**
 * @category Configurable Queries
 * @description Creates Query form elements and injects them into the target form.
 * @clientOnly
 * @supportedApps EXB, GWV
 */
export default class AddQueryElements implements IActivityHandler {
    searchFieldTypes = ["AutoComplete",
        "CheckBox",
        "CheckGroup",
        "DatePicker",
        "DateRangePicker",
        "DateTimePicker",
        "DropDownList",
        "ItemPicker",
        "ListBox",
        "Number",
        "NumberRangeSlider",
        "NumberSlider",
        "RadioGroup",
        "TextArea",
        "TextBox",
        "TimePicker"];

    async execute(inputs: QueryProperties, context: IActivityContext): Promise<AddQueryOutputs> {
        const { searchFields, form, layer, where, title, description } = inputs;
        if (!layer) {
            throw new Error("layer is required");
        }
        if (!searchFields) {
            throw new Error("searchFields is required");
        }
        if (!form) {
            throw new Error("targetForm is required");
        }
        if (!title) {
            throw new Error("title is required");
        }


        let i = 0;
        const addElement = new AddFormElement();
        const setItems = new SetFormElementItems();
        if (!form.state["querySection"]) {
            const section = {
                title: title,
                description: description
            };
            await addElement.execute({
                elementName: "querySection",
                elementType: "Section",
                form: form,
                element: section
            }, context);

        }

        for (const searchField of searchFields) {
            if (!this.searchFieldTypes.some(x => x === searchField.type)) {
                throw new Error(`Unsupported Form Element: ${searchField.type}`);
            }
            let newElement: defs.Element = searchField.element ? searchField.element : 
            {
                selectionMode: "multiple",
            };
            newElement.type = searchField.type;
            newElement.rowNumber = i + 3;
            newElement.section = { "name": "querySection" };
            newElement.dependsOn = this.setCascade(searchField, searchFields, i);
            newElement.title = searchField.title;
            newElement.description = searchField.description;

            let items: Lookup<defs.Item> = {};

            const elementHasItems = ["CheckGroup", "DropDownList", "ItemPicker", "ListBox", "RadioGroup"].some(x => x === searchField.type);
            if (elementHasItems && !searchField.cascade) {
                items = await this.setElementItems(where, searchField, searchFields, layer, form, false, context);


            }
            await addElement.execute({
                elementName: searchField.field,
                elementType: searchField.type,
                form: form,
                element: newElement
            }, context);

            newElement = form.state[searchField.field];
            if (Object.keys(items).length != 0) {
                await setItems.execute({ form: form, items: items, elementName: searchField.field }, context);
            }

            if (searchField.value && !searchField.cascade) {
                newElement.value = searchField.value;
                await this.setItemState(newElement, form, searchField.field, context);
                (form as any).route = true;
            }
            if (searchField.events) {
                await this.setFormItemEvent(form, searchField, context);
            }
            i++;
        }
        return {
            result: inputs.form
        };
    }

    private setCascade(searchField: SearchField, searchFields: SearchField[], index: number): string | undefined {
        if(typeof searchField.cascade === "string") {
            return searchField.cascade;
        } else if(searchField.cascade === true) {
            return searchFields[index - 1].field;
        }
        return undefined;
    }
    private async setItemState(element: defs.Element, form: DisplayFormOutputs, elementId: string, context: IActivityContext) {
        const value = this.getFormElementValue(element);
        if (value && value != null && element.items && Object.keys(element.items).length != 0) {
            if (Array.isArray(value) && isItemsRef(value as defs.Value)) {
                await this.setMultipleItemsState(value as defs.Item[], form, elementId, context);
            } else {
                const setCurrent = new SetCurrentFormElementItem();
                await setCurrent.execute({
                    form: form,
                    elementName: elementId,
                    matchType: "value",
                    value: value
                }, context);
            }
        }
    }

    private async setMultipleItemsState(items: defs.Item[], form: DisplayFormOutputs, elementId: string, context: IActivityContext) {
        const setItemProperty = new SetFormElementItemProperty();
        const keys: string[] = [];
        const element = form.state[elementId];
        if (element.items) {
            for (const item of items) {
                const key = this.getItemKey(item, element.items);
                if (key) {
                    keys.push(key);
                }
            }
            for (const key of keys) {
                await setItemProperty.execute({
                    form: form,
                    itemKey: key,
                    propertyName: "checked",
                    elementName: elementId,
                    propertyValue: true
                }, context);
            }
        }
    }

    private async setElementItems(where: string | undefined,
        searchField: SearchField,
        searchFields: SearchField[],
        layer: __esri.FeatureLayer | __esri.SubtypeGroupLayer | __esri.SubtypeSublayer,
        form: DisplayFormOutputs,
        fullQuery: boolean,
        context: IActivityContext): Promise<Lookup<defs.Item>> {

        const getItemsFromColl = new GetFormElementItemsFromCollection();
        const getItemsFromFeatures = new GetFormElementItemsFromFeatures();
        const results = await this.queryValues(where, searchField, searchFields, form, layer, true, fullQuery);
        const featureLayerInfo = layer.type === "subtype-sublayer" ? layer.parent : layer;
        const codedValues = featureLayerInfo ? GetLayerCodedValues.getCodedValues(
            featureLayerInfo,
            searchField.field) : undefined;
        let items;

        if (codedValues) {
            const collItems = getItemsFromColl.execute({
                collection: codedValues.filter((x) => {
                    return results.features.some(y => y.attributes[searchField.field] === x.code)
                }),
                labelFieldName: "name", valueFieldName: "code"
            }, context);
            items = collItems.items;
        } else {
            const values = getItemsFromFeatures.execute({ features: results.features, labelFieldName: searchField.field, valueFieldName: searchField.field });
            items = values.items;
        }
        return items;
    }

    private async setFormItemEvent(form: DisplayFormOutputs, searchField: SearchField, context: IActivityContext) {
        const setEvent = new SetFormElementEvent();
        if (searchField.events) {
            for (const [key, eventName] of Object.entries(searchField.events)) {
                if (eventName) {
                    await setEvent.execute(
                        {
                            eventName: key,
                            displayFormId: context.ambient.activityContexts["$$form"].activity.name,
                            form: form,
                            targetActivityId: eventName,
                            elementName: searchField.field
                        },
                        context);
                }
            }
        }
    }

    private getFormElementValue(element: defs.Element): ElementValue | undefined | null {
        if (element.value === undefined) {
            return undefined;
        }

        let value: ElementValue | undefined;

        if (isDataRef(element.value)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            value = element.value.data;
        } else if (isDateRangeRef(element.value)) {
            value = [element.value.startDate, element.value.endDate];
        } else if (isDateTimeRef(element.value)) {
            value = element.value.value;
        } else if (isItemsRef(element.value)) {
            value = element.value.items;
        } else if (isNumberRef(element.value)) {
            value = element.value.numeric;
        } else {
            value = element.value as any;
        }
        return value;
    }

    private async queryValues(
        where: string | undefined,
        searchField: SearchField,
        searchFields: SearchField[],
        form: DisplayFormOutputs,
        layer: __esri.FeatureLayer | __esri.SubtypeGroupLayer | __esri.SubtypeSublayer,
        distinct: boolean,
        fullQuery: boolean): Promise<__esri.FeatureSet> {
        const simpleWhere = where && where.length > 0 ? where : "1=1";
        const genWhereClause = new GenerateWhereClause();
        let subtypeField: string | undefined= undefined;
        if(layer.type === "subtype-sublayer") {
            subtypeField = layer.parent.subtypeField;
        } else {
            subtypeField = layer.subtypeField;
        }
        const outFields = [searchField.field];
        if (subtypeField) {
            outFields.push(subtypeField);
        }
        const definitionExpression = this.getDefinitionExpression(layer);

        const whereClause = fullQuery ? genWhereClause.execute({ layer: layer, queryFields: searchFields, targetForm: form }) : { result: definitionExpression ? definitionExpression : simpleWhere };

        return await this.queryLayer(layer, whereClause.result as string, distinct, outFields);
    }

    async queryLayer(layer: __esri.FeatureLayer | __esri.SubtypeGroupLayer | __esri.SubtypeSublayer, where: string, distinct: boolean, outFields: string[]): Promise<__esri.FeatureSet> {
        let layerToQuery;
        if (layer.type === "subtype-sublayer" && layer.parent) {
            layerToQuery = layer.parent;
        } else {
            layerToQuery = layer;
        }

        const query = new Query();
        query.where = where;
        query.returnGeometry = false;
        query.returnDistinctValues = distinct;
        query.outFields = outFields;

        return await layerToQuery.queryFeatures(query);
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

    private getItemKey(inItem: defs.Item, items: Lookup<defs.Item>): string | undefined {

        for (const itemKey in items) {
            const item = items[itemKey];
            if (inItem.value === item.value) {
                return itemKey;
            }
        }
        return undefined;
    }
}
