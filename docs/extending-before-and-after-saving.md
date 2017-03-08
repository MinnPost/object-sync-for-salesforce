# Extending before and after saving

When the plugin saves data, either on a `push` or `pull` event, it has a few actions that can be run that don't change any of the data the plugin is dealing with, but do allow developers to do additional things.

Each event has an action that runs right before data is saved, and then right after there is one for a successful save and one for a failed save.

## Salesforce Pull

The action hooks that run on around the save on a `pull` event are:

- `salesforce_rest_api_pre_pull`
- `salesforce_rest_api_pull_fail`
- `salesforce_rest_api_pull_success`

## Salesforce Push

The action hooks that run on around the save on a `push` event are:

- `salesforce_rest_api_pre_push`
- `salesforce_rest_api_push_fail`
- `salesforce_rest_api_push_success`