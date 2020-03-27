# REST API

This plugin contains some REST API functionality, allowing other applications to run calls on it. We have included some documentation of each endpoint

## Pull endpoints

### Check for updated records

- URL: `/wp-json/object-sync-for-salesforce/pull`
- HTTP Method: GET

Sending a GET request to this URL will cause the plugin to check for updated/deleted records, and if it finds any, it will process them according to the plugin's fieldmaps. This is basically a manual version of what the plugin does already on schedule.

### Pull a single record from Salesforce

- URL: `/wp-json/object-sync-for-salesforce/pull`
- HTTP Method: POST
- Parameters required: `salesforce_id` and `salesforce_object_type`

Sending a POST request to this URL with a valid Salesforce ID and an object type - Contact, for example - will cause the plugin to pull that object's data and process it according to the plugin's fieldmaps.

## Push endpoints

### Push a single record to Salesforce

- URL: `/wp-json/object-sync-for-salesforce/push`
- HTTP Method: POST
- Parameters required: `wordpress_id` and `wordpress_object_type`

Sending a POST request to this URL with a valid WordPress ID and an object type - user, for example - will cause the plugin to gather that object's data in WordPress, and process it according to the plugin's fieldmaps, and attempt to push it to Salesforce.

