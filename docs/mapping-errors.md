# Mapping errors

If the plugin fails in the middle of creating or updating a map between two objects, a row should be created on the Mapping Errors screen. If it is a push error attempting to create a new Salesforce recod, it will tell you the WordPress object ID it was trying to map. If it is a pull error attempting to create a new WordPress record, it will tell you the Salesforce ID. If it is attempting to update an existing record, it should have both.

You can update the ID for either the Salesforce or WordPress record in an object map, or you can delete the row. Leaving these rows can cause problems. For example, if one of the records in them is modified, it cannot be connected to a new object map that might work properly.

The Mapping Errors tab has further explanation when it is present. It will not appear in WordPress unless errors have occurred.
