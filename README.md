[![CI/CD](https://github.com/vertigis/workflow-activities-configurable-queries/workflows/CI/CD/badge.svg)](https://github.com/vertigis/workflow-activities-configurable-queries/actions)
[![npm](https://img.shields.io/npm/v/@vertigis/workflow-activities-configurable-queries)](https://www.npmjs.com/package/@vertigis/workflow-activities-configurable-queries)

This project contains activities for generating and executing configurable queries.  A configurable query workflow is comprised of a dynamically generated form and dynamically generated where clause to be applied to an ArcGIS Feature Query.  Queries are configured using a collection of `SearchFields`, which define the field, form element and operation to be applied to a Feature Layer query. The project also includes a complete Workflow implementation.

## Requirements

### VertiGIS Studio Workflow Versions

These activities are designed to work with VertiGIS Studio Workflow versions `5.30.1` and above.

## Usage
To use these activities in [VertiGIS Studio Workflow Designer](https://apps.vertigisstudio.com/workflow/designer/) you need to register an activity pack and then add the activities to a workflow.

### Register the Configurable Queries activity pack

1. Sign in to ArcGIS Online or Portal for ArcGIS
1. Go to **My Content**
1. Select **Add Item > An application**
    - Type: `Web Mapping`
    - Purpose: `Ready To Use`
    - API: `JavaScript`
    - URL: The URL to this activity pack manifest
        - Use https://unpkg.com/@vertigis/workflow-activities-configurable-queries/activitypack.json for the latest version
        - Use https://unpkg.com/@vertigis/workflow-activities-configurable-queries@1.0.0/activitypack.json for a specific version
        - Use https://localhost:5000/activitypack.json for a local development version
    - Title: Your desired title
    - Tags: Must include `geocortex-workflow-activity-pack`
1. Reload [VertiGIS Studio Workflow Designer](https://apps.vertigisstudio.com/workflow/designer/)
1. These activities will now appear in the activity toolbox in a `Configurable Queries` category

### Search Field 
The [Add Query Elements](../main/src/activities/AddQueryElements.ts) activity accepts an array of Search Field JSON objects as an input.  [The SearchFields.json](../main/src/samples/SearchFields.json) file provides an example.

#### Search Field Schema
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
### Configured Query Workflow
The [Configured Query Workflow](../main/workflows/ConfiguredQuery/content.json) is a full implementation of a configurable query form.  It can be used as-is, run as a SubWorkflow from another Workflow or modified to meet your needs.

#### Usage
To use the Configured Query Workflow, download the content.json to your local machine and import it into your Portal using VertiGIS Studio Workflow designer.  

##### Workflow Inputs:
 - layerId (Required): The layer Id for the layer to run the stored query against.  Supported layer types include [FeatureLayer](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html), [SubtypeGroupLayer](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-SubtypeGroupLayer.html) and [SubtypeSubLayer](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-support-SubtypeSublayer.html).
 - formTitle (Required): The title to appear in the form.
 - formDescription (Optional): The description text to appear with the form's title.
 - searchFields (Required): An array of SearchField objects.
 - eventSubWorkflow (Optional): The Url to a subworkflow to be executed when a form event is fired. The SearchFields, event type, event data and form state are passed to the subworkflow.

 ##### Workflow Outputs:
 - action: The form action.
 - formState: The state of the form.
 - queryResults: The results of the configured query if the workflow was not cancelled.

### Select Query Workflow
 The [Select Query Workflow](../main/workflows/SelectQuery/content.json) presents the user with a list of queries to execute and runs the Configured Query Workflow in a Run Workflow activity.

#### Usage
To use the Select Query Workflow, download the content.json to your local machine and import it into your Portal using VertiGIS Studio Workflow designer.

##### Workflow Inputs:
- formWorkflow (Required): The Url to the Configured Query Workflow
- inputModel: An array of json objects that include the inputs for the Configured Query Workflow. See the [Input Model](../main/src/samples/InputModel.json) for an example of how to configure this parameter.
- eventSubWorkflow (Optional): The Url to a subworkflow to be executed when a form event is fired. The SearchFields, event type, event data and form state are passed to the subworkflow.

## Development

This project was bootstrapped with the [VertiGIS Studio Workflow SDK](https://github.com/vertigis/vertigis-workflow-sdk). Before you can use your activity pack in the [VertiGIS Studio Workflow Designer](https://apps.vertigisstudio.com/workflow/designer/), you will need to [register the activity pack](https://developers.vertigisstudio.com/docs/workflow/sdk-web-overview#register-the-activity-pack).

## Available Scripts

Inside the newly created project, you can run some built-in commands:

### `npm run generate`

Interactively generate a new activity or form element.

### `npm start`

Runs the project in development mode. Your activity pack will be available at [http://localhost:5000/main.js](http://localhost:5000/main.js). The HTTPS certificate of the development server is a self-signed certificate that web browsers will warn about. To work around this open [`https://localhost:5000/main.js`](https://localhost:5000/main.js) in a web browser and allow the invalid certificate as an exception. For creating a locally-trusted HTTPS certificate see the [Configuring a HTTPS Certificate](https://developers.vertigisstudio.com/docs/workflow/sdk-web-overview/#configuring-a-https-certificate) section on the [VertiGIS Studio Developer Center](https://developers.vertigisstudio.com/docs/workflow/overview/).

### `npm run build`

Builds the activity pack for production to the `build` folder. It optimizes the build for the best performance.

Your custom activity pack is now ready to be deployed!

See the [section about deployment](https://developers.vertigisstudio.com/docs/workflow/sdk-web-overview/#deployment) in the [VertiGIS Studio Developer Center](https://developers.vertigisstudio.com/docs/workflow/overview/) for more information.

## Documentation

Find [further documentation on the SDK](https://developers.vertigisstudio.com/docs/workflow/sdk-web-overview/) on the [VertiGIS Studio Developer Center](https://developers.vertigisstudio.com/docs/workflow/overview/)
