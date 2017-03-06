# Extending the mapping object

From a database perspective, the mapping object, or object map, is a row from the `wp_salesforce_object_map` table. It holds the names of the objects, the fields and what methods modify the fields, what events are supported triggers, and the other settings configured in the [mapping documentation](./mapping.md).

Both directions, `push` and `pull`, allow for this mapping object to be extended, or even replaced, with hooks.

## Salesforce Pull

## Salesforce Push

