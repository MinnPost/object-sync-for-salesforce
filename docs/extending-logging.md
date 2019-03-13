# Extending logging

By default, this plugin creates Log post type entries that are only visible to users with the `configure_salesforce` capability (there is no public facing view for this content type; it is always only visible within the admin section). Use the `object_sync_for_salesforce_logging_post_type_args` hook to modify this, and any other, `post_type` arguments for the Log post type.

WordPress provides documentation for the arguments in the [developer handbook](https://developer.wordpress.org/reference/functions/register_post_type/). The possible capabilities, which you'll need if you want to allow other users to view the logs, are documented separately [in the handbook](https://developer.wordpress.org/reference/functions/get_post_type_capabilities/).

This plugin also allows you to extend who has the `configure_salesforce` capability. This is documented in the [extending roles documentation](./extending-roles.md).

## Code example

This example would give editor users the capability to see these logs as well.

```php
add_filter( 'object_sync_for_salesforce_logging_post_type_args', 'set_log_visibility', 10, 1 );
function set_log_visibility( $log_args ) {
	$log_args['capabilities'] = array(
		'edit_post'          => 'edit_published_posts',
		'read_post'          => 'edit_published_posts',
		'delete_post'        => 'edit_published_posts',
		'edit_posts'         => 'edit_published_posts',
		'edit_others_posts'  => 'edit_published_posts',
		'delete_posts'       => 'edit_published_posts',
		'publish_posts'      => 'edit_published_posts',
		'read_private_posts' => 'edit_published_posts',
	);
    return $log_args;
}
```
