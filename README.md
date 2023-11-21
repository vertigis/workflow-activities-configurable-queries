# workflow-activities-configurable-queries
This project contains activities for generating and executing configurable queries.  A configurable query workflow is comprised of a dynamically generated form and dynamically generated where clause to be applied to an ArcGIS Feature Query.  Queries are configured using a collection of SearchFields, which define the field, form element and operation to be applied to a Feature Layer query. The project also includes a complete Workflow implementation.

## Search Field 
The [Add Query Elements](../blob/main/src/activities/AddQueryElements.ts) activity accepts an array of Search Field JSON objects as an input.  [The SearchFields.json](../blob/main/src/samples/SearchFields.json) file provides an example.

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
  title: string,
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
  element: defs.Element
}
```
## Configured Query Workflow
The [Configured Query Workflow](../blob/main/src/workflows/ConfiguredQuery/content.json) is a full implementation of a configurable query form.  It can be used as-is, run as a SubWorkflow from another Workflow or modified to meet your needs.
### Usage
To use the Configured Query Workflow, download the content.json to your local machine and import it into your Portal using VertiGIS Studio Workflow designer.  
#### Workflow Inputs:
 - layerId (Required): The layer Id for the layer to run the stored query against.  Supported layer types include [FeatureLayer](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html), [SubtypeGroupLayer](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-SubtypeGroupLayer.html) and [SubtypeSubLayer](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-support-SubtypeSublayer.html).
 - formTitle (Required): The title to appear in the form.
 - formDescription (Optional): The description text to appear with the form's title.
 - searchFields (Required): An array of SearchField objects.
 - eventSubWorkflow (Optional): The Url to a subworkflow to be executed when a form event is fired. The SearchFields, event type, event data and form state are passed to the subworkflow.
 #### Workflow Outputs:
 action: The form action.
 formState: The state of the form.
 queryResults: The results of the configured query if the workflow was not cancelled.

 ## Select Query Workflow
 The [Select Query Workflow](../blob/main/src/workflows/SelectQuery/content.json) presents the user with a list of queries to execute and runs the Configured Query Workflow in a Run Workflow activity.
### Usage
To use the Select Query Workflow, download the content.json to your local machine and import it into your Portal using VertiGIS Studio Workflow designer.
#### Workflow Inputs:
- formWorkflow (Required): The Url to the Configured Query Workflow
- inputModel: An array of json objects that include the inputs for the Configured Query Workflow. See the [Input Model](../blob/main/src/samples/InputModel.json) for an example of how to configure this parameter.
- eventSubWorkflow (Optional): The Url to a subworkflow to be executed when a form event is fired. The SearchFields, event type, event data and form state are passed to the subworkflow.
