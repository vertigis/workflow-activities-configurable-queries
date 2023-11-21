/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { defs } from "@vertigis/workflow/forms/FormHost";

export interface SearchField {
    field: string,
    operator: string,
    cascade: boolean | string,
    type:
    | "AutoComplete"
    | "CheckBox"
    | "CheckGroup"
    | "DatePicker"
    | "DateRangePicker"
    | "DateTimePicker"
    | "DropDownList"
    | "ItemPicker"
    | "ListBox"
    | "Number"
    | "NumberRangeSlider"
    | "NumberSlider"
    | "RadioGroup"
    | "TextArea"
    | "TextBox"
    | "TimePicker"
    | string;
    
    title: string;
    description?: string;
    value?: defs.Value;
    events?: {
        changed?: string | undefined,
        clicked?: string | undefined,
        populate?: string | undefined,
        suggest?: string | undefined,
        validate?: string | undefined,
    },
    element?: defs.Element;
}

export interface CodedValue {
    code: number;
    name: string;
    isRetired?: boolean;
    dependentCodedValues?: Record<string, string>;
}

export interface Domain {
    type: string;
    name: string;
    description?: string;
    codedValues?: CodedValue[];
}

export enum EsriFieldType {
    OID = "oid",
    String = "string",
    Integer = "integer",
    SmallInteger = "small-integer",
    Double = "double",
    Date = "date",
    Guid = "guid",
    GlobalId = "global-id"
}

export type ElementValue = boolean | string | number | Date | number[] | Date[] | File[] | defs.Item[];






