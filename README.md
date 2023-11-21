# workflow-activities-configurable-queries
This project contains activities for generating and executing configurable queries.  A configurable query workflow is comprised of a dynamically generated form and dynamically generated where clause to be applied to an ArcGIS Feature Query.  Queries are configured using a collection of SearchFields, which define the field, form element and operation to be applied to a Feature Layer query. The project also includes Workflows.

## Search Field 
The [Add Query Elements](https://github.com/vertigis/workflow-activities-configurable-queries/blob/main/src/activities/AddQueryElements.ts) activity accepts an array of Search Field JSON objects as an input.  [The SearchFields.json](https://github.com/vertigis/workflow-activities-configurable-queries/blob/main/src/samples/SearchFields.json) file provides an example.

### Search Field Schema
```js
{
  /* The name of layer field to search (Required) */
  field: string,
  /* The SQL operator to apply to the field (=, !=, <, >, >=, <=, IN, and BETWEEN) (Required) */
  operator: string,
  /* The name of the field to use as the parent in a cascading relationship.
     When a boolean is used then the previous field is used. (Required) */
  cascade: boolean | string,
  /* The form element type to use for the search. (Required) */
  type: "AutoComplete" |
        "CheckBox" |
        "CheckGroup" |
        "DatePicker" |
        "DateRangePicker" |
        "DateTimePicker" |
        "DropDownList" |
        "ItemPicker" |
        "ListBox" |
        "Number" |
        "NumberRangeSlider" |
        "NumberSlider" |
        "RadioGroup" |
        "TextArea" |
        "TextBox" |
        "TimePicker",
    
  /* The title to appear for the search element. (Required) */
  title: string;
  /* The description to appear for the search element. (Optional) */
  description: string,
  /* The default value of the search field.  Only applies when cascade is false.  (Optional) */
  value : defs.Value,
  /* The events to be used for the element. If cascade is set to true then a 'populate' event must be set.  If the type is Autocomplete then the
     suggest event must be set.  (Optional) */
  events: {
    changed: string | undefined,
    clicked: string | undefined,
    populate: string | undefined,
    suggest: string | undefined,
    validate: string | undefined,
  },
  /* A form element JSON object.  This is useful when finer grained control over the form is required. (Optional) */
  element: defs.Element;
}
```