=== Object Sync for Salesforce ===
Contributors: minnpost, inn_nerds, jonathanstegall, benlk, rclations, harmoney
Donate link: https://www.minnpost.com/support/?campaign=7010G0000012fXGQAY
Tags: salesforce, sync, crm
Requires at least: 6.4
Tested up to: 6.6
Requires PHP: 7.0
Stable tag: 2.2.11
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Object Sync for Salesforce maps and syncs data between Salesforce objects and WordPress objects.

== Description ==

For any supported WordPress content types (e.g. post, page, user, or any supported custom content type in your installation), you can assign Salesforce objects that will be created / updated / deleted when the data in WordPress is saved, and the WordPress objects can be created / updated / deleted when the data in Salesforce is saved.

For each such combination of object and content type, choose which fields should be mapped to one another, creating a fieldmap. The plugin acts on matching data after it is installed.

This plugin also includes developer hooks that allow for additional plugins to modify what data the plugin is working with, or what happens upon specific events.

== Installation ==

The plugin documentation contains [initial setup instructions](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/initial-setup.md). This is the fastest way to get the plugin running on your site.

We maintain [extensive documentation](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/readme.md) of the plugin beyond its installation process as well, including its developer hooks. This documentation also exists in the plugin's `docs` folder when it is downloaded.

== Frequently Asked Questions ==

### Mapping custom fields

WordPress stores metadata as key/value pairs in its database. Many plugins and themes use this method to store custom field data. Object Sync for Salesforce supports mapping these fields (many other plugins use non-standard methods, and this plugin may or may not support them).

There's a [helpful spreadsheet](https://docs.google.com/spreadsheets/d/1mSqienVYxLopTFGLPK0lGCJst2knKzXDtLQRgwjeBN8/edit#gid=3) (we are not affiliated with it, we just think it's useful) comparing various options for custom fields you can review. If the plugin you wish to use uses Meta-based Storage (listed in the spreadsheet), you should be able to use it with Object Sync for Salesforce, but how well they work together will vary. Plugins with full meta compatibility (also listed in the spreadsheet) may work the best, but you don't have to restrict yourself to those.

Object Sync for Salesforce, however, cannot see meta fields before the field has at least one value in the database. For example, if you have a "testfield" on your user object, it won’t be in the fieldmap options until there is at least one user that has a value for the field.

If you load Object Sync for Salesforce and then store data for a new meta field after this load, make sure you click the "Clear the plugin cache" link on the Fieldmaps tab.

### Mapping required fields

Related to the mapping of custom fields, but raising its own distinct questions and problems that can make this plugin more complicated, is the issue of mapping between required fields in WordPress or Salesforce.

**How WordPress handles meta fields**

This plugin runs on WordPress' core actions for user, post, comment, attachment, and term objects, which run when those objects are created or deleted. This plugin also runs on WordPress' meta actions for those objects. The way WordPress works is that these actions don't happen together, so metadata is generally not part of the core action's dataset.

**How this affects required fields**

The way these actions work means that if a field is required in Salesforce, it needs to be sent as part of the first, core WordPress action associated with the WordPress object. If it is only added as part of the second action, the metadata, it will not be sent and the Salesforce operation will fail.

How this works in detail can vary for different WordPress object types. Some examples:

- WordPress user objects: this plugin runs first on the `user_register` action. The initial action has access to data stored in `wp_user`. It also has access to some fields that are stored in wp_usermeta (`first_name` and `last_name`), but it does not have access to custom user fields.
- WordPress post objects (this also includes attachments and custom post types): this plugin runs first on the `save_post` action. This means it has access to data stored in `wp_posts` only, not data stored in `wp_postmeta`.
- WordPress term objects: this plugin runs first on the `create_term` action. This means it only has access to the Term ID, Term Taxonomy ID, and taxonomy data, not other custom fields.
- WordPress comment objects: this plugin runs first on the `comment_post` action. This means it has access to the comment ID, whether the comment is approved, and the comment data array.

Again, this all applies to the first operation the plugin runs, which is when Salesforce will expect to receive required fields.

If you are storing a required field's value in a meta field in WordPress, you will run into errors if it is not sent as part of the first action.

### Syncing pre-existing data

This plugin was built to sync data that is created after it was installed. However, there are some techniques that can import pre-existing data. See the [Import & Export](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/import-export.md) section of the documentation for methods you can use for this.

### Using with ACF (Advanced Custom Fields)

Object Sync for Salesforce does not and will not "officially" support ACF because you don't have to use ACF to use WordPress or to use Salesforce. However, they are **generally** usable together.

Things to know:

1. See the answer above about custom fields. Any ACF field must have at least one value in the database before Object Sync for Salesforce can map it.
2. When you try to map an ACF field, you'll see one that has an underscore in front of it, and one that does not. This is because ACF uses both for its own purposes. As long as you map the ACF field that **does not** have the underscore in front of it, you should be able to get data to and from Salesforce. For example, you could map a `test_field` to a `Contact_description` field. The fieldmap screen will show a `_test_field` in the dropdown, but you should be able to safely ignore that, and only map `test_field`.

While we will not include code that only runs for ACF in this plugin, we would happily point to any add-on plugin that uses Object Sync for Salesforce hooks to build a more comprehensive integration with ACF for all users who install this plugin while they're running ACF.

### Using with WooCommerce

Object Sync for Salesforce doesn't have, and will not have, intentional support for WooCommerce. It kind of supports it, to the extent that WooCommerce uses WordPress' default ways of creating objects and data. WooCommerce is very complicated, and on top of that it often deviates from those default WordPress methods, and it's certainly possible that this plugin won't support it when it does.

This doesn't mean you can't use them together, but it does mean this plugin is not intentionally built for that purpose. Because WooCommerce is not a requirement to use WordPress, or to use Salesforce, it will never be built directly into Object Sync for Salesforce.

Object Sync for Salesforce does have abundant developer hooks, and WooCommerce has its own API, and it would be possible to build an add-on plugin to provide full support by integrating these (we would happily point to it for all users who install this plugin while they're running WooCommerce).

### Troubleshooting

If you are having trouble setting up or configuring the plugin, we've provided answers to some common problems in our [troubleshooting](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/troubleshooting.md) document. Expanding this document is also a great way to [contribute](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/contributing.md) to this plugin.

### Plugin documentation

There is extensive documentation of this plugin, including its developer hooks, [on GitHub](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/readme.md). This documentation also exists inside the `docs` folder when you download the plugin from the WordPress directory.

### Getting support using this plugin

We make an effort to answer support requests in the [WordPress plugin forum](https://wordpress.org/support/plugin/object-sync-for-salesforce/). If you have these requests, please put them in that forum only. Do not send them by email or by social media.

While MinnPost's nonprofit newsroom does welcome [donations](https://www.minnpost.com/support/?campaign=7010G0000012fXGQAY) to support our work, this plugin does not have a paid version.

Use the plugin's GitHub repository for bugs, feature requests, and other additions and especially do that if you can help solve these things.

### Extending this plugin

WordPress developers can use hooks in this plugin to extend its functionality. These are listed, with links to each hook's documentation, in the [developer hooks documentation](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/all-developer-hooks.md), and are frequently mentioned throughout the plugin's [documentation](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/readme.md).

We host [a document](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/example-extending-plugins.md) intended to list plugins that use these hooks or otherwise extend this plugin, and we welcome additions.

### Contribute to plugin development

If you'd like to suggest a feature, or if you think you've encountered a bug, you can [create an issue](https://github.com/minnpost/object-sync-for-salesforce/issues) on our GitHub repository. We actively add our own issues to the list, and comment on their progress.

We welcome contributions of code, documentation, or translations to this project from other developers. See our [contributing guidelines](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/contributing.md).

### Finding other sync options

This plugin can be relatively complicated, and sometimes other plugins can effectively integrate Salesforce and WordPress, especially if there are more limited, specific requirements. If one of these can meet those requirements, use it. We're happy to link to additional choices here, as well.

- [Object Data Sync for Salesforce](https://plugins.miniorange.com/wordpress-object-sync-for-salesforce) is a fully supported and maintained plugin from another company that also synchronizes WordPress and Salesforce objects. 
- [WordPress-to-Lead for Salesforce CRM](https://appexchange.salesforce.com/listingDetail?listingId=a0N30000003GxgkEAC) can be installed through the Salesforce AppExchange. It allows you to run a contact form which users on your WordPress site can submit, and the results are added to Salesforce as a Lead object.
- [Brilliant Web-to-Lead for Salesforce](https://wordpress.org/plugins/salesforce-wordpress-to-lead/) can be installed through the WordPress plugin directory. This is rather similar to the first option, but is a bit more customizable. By customizable, you can select the fields in WordPress and theme it in your WordPress theme.
- [Gravity Forms Salesforce](https://wordpress.org/plugins/gf-salesforce-crmperks/) can be installed through the WordPress plugin directory. It is quite powerful, as it can send form submissions from your WordPress site to Salesforce as whatever object you need. It's important to mention that this works for any form created with the [Gravity Forms](http://www.gravityforms.com/) plugin. It's also important to mention that this does not sync data back from Salesforce into Wordpress.
- [WP Fusion Lite](https://wordpress.org/plugins/wp-fusion-lite/) can be installed through the WordPress plugin directory. This plugin is able to sync WordPress user records with contacts from different CRMs (including Salesforce) and manage content access based on tags it uses. This plugin also has a paid version that integrates with other WordPress plugins.
- [WooCommerce Salesforce Integration](https://wordpress.org/plugins/woo-salesforce-plugin-crm-perks/) can be installed through the WordPress plugin directory. This plugin is able to create records in Saleforce when orders are placed through WooCommerce. This plugin also offers a premium version.
- **Third party integration apps** such as [Zapier](https://zapier.com/) are subscription-based, paid ways to integrate different systems, and they offer differing amounts of customizability. They will usually sync in both directions, so in this case from WordPress to Salesforce and vice versa. The only limitations of something like this are the cost over time, and the possible vulnerability of basing an integration on a third party that could, at some point, go away.
- [Visualforce](https://developer.salesforce.com/page/An_Introduction_to_Visualforce) If you are or have a Salesforce developer, you can build MVC based applications that integrate with Salesforce. It would be possible to build a system that uses, for example, the [WordPress REST API](https://developer.wordpress.org/rest-api/) to send and receive data to and from WordPress. This could be, in many ways, the flip side of what our plugin here does, but the complexity would be the same if the scope was the same.
- **Build other integrations in WordPress** this plugin focuses on the Salesforce REST API, as it covers the integration needs we have. It also provides some support for the SOAP API, primarily to detect merges of Salesforce records. Salesforce also has other developer options: the Bulk API, and the Metadata API, the Analytics API, and likely more functionality that is only in SOAP. Developers could extend this plugin to integrate with one of these. We would welcome any pull requests!

## Changelog

See our [full changelog](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/changelog.md) for information about all previous releases.

== Upgrade Notice ==

= 2.0.0 =
2.0.0 includes a major upgrade to Action Scheduler, the underlying queue technology that runs syncing for this plugin, as well as renaming of many plugin files. You may want to make a full site backup before upgrading, and if you have access to a staging environment you may want to run it there before you run it on your production website.

= 2.1.0 =
2.1.0 includes an upgrade to Action Scheduler (version 3.4.0), the underlying queue technology that runs syncing for this plugin. The noteworthy piece is that this raises the minimum supported version of WordPress to 5.2. If you are running an older version of WordPress than 5.2, you shouldn't upgrade this plugin.

= 2.1.2 =
Apologies for the buggy release of version 2.1.0 and 2.1.1. I'm hopeful that these issues are resolved in 2.1.2.

= 2.2.0 =
In version 2.2.0, the Salesforce REST API version is no longer configured in the plugin settings. For backward-compatibility, the plugin will continue to use stored values until version 3.0.0 unless they are the same as the plugin's default value. In 2.2.0, this is version 55.0.
