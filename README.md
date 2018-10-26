# Object Sync for Salesforce

[![Build Status](https://travis-ci.org/MinnPost/object-sync-for-salesforce.svg?branch=master)](https://travis-ci.org/MinnPost/object-sync-for-salesforce) [![Code Climate](https://codeclimate.com/github/MinnPost/object-sync-for-salesforce/badges/gpa.svg)](https://codeclimate.com/github/MinnPost/object-sync-for-salesforce) [![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/MinnPost/object-sync-for-salesforce/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/MinnPost/object-sync-for-salesforce/?branch=master)

Object Sync for Salesforce is a WordPress plugin that maps and syncs data between Salesforce objects and WordPress content types.

## Getting started

For any supported WordPress content types (post, page, user, or custom content types), you can assign Salesforce objects that will be created / updated / deleted when the data in WordPress is saved, and the WordPress objects can be created / updated / deleted when the data in Salesforce is saved.

For each such combination of object and content type, choose which fields should be mapped to one another, creating a fieldmap. The plugin acts on matching data after it is installed.

To get started quicky, install Object Sync for Salesforce from the [WordPress plugin repository](https://wordpress.org/plugins/object-sync-for-salesforce/) and follow the [setup instructions](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/initial-setup.md). We also host extensive additional [documentation](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/readme.md).

### Requirements

1. A PHP installation of at least version 5.5.
2. A WordPress installation of at least version 4.6.
3. SSL support.
4. A Salesforce account. Developers can register for a free Developer Edition account at [https://developer.salesforce.com/signup](https://developer.salesforce.com/signup)
5. A remote application/connected Salesforce app for authorization.

### Installation and setup

The plugin documentation contains [initial setup instructions](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/initial-setup.md). This is the fastest way to get the plugin running on your site.

## Finding other options

This plugin can be relatively complicated, and sometimes other plugins can effectively integrate Salesforce and WordPress, especially if there are more limited, specific requirements. If one of these can meet those requirements, use it. We're happy to link to additional choices here, as well.

- [WordPress-to-Lead for Salesforce CRM](https://appexchange.salesforce.com/listingDetail?listingId=a0N30000003GxgkEAC) can be installed through the Salesforce AppExchange. It allows you to run a contact form which users on your WordPress site can submit, and the results are added to Salesforce as a Lead object.
- [Brilliant Web-to-Lead for Salesforce](https://wordpress.org/plugins/salesforce-wordpress-to-lead/) can be installed through the WordPress plugin directory. This is rather similar to the first option, but is a bit more customizable. By customizable, you can select the fields in WordPress and theme it in your WordPress theme.
- [Gravity Forms Salesforce Add-on](https://wordpress.org/plugins/gravity-forms-salesforce/) can be installed through the WordPress plugin directory. It is quite powerful, as it can send form submissions from your WordPress site to Salesforce as whatever object you need. It's important to mention that this works for any form created with the [Gravity Forms](http://www.gravityforms.com/) plugin. It's also important to mention that this does not sync data back from Salesforce into Wordpress.
- **Third party integration apps** such as [Zapier](https://zapier.com/) are subscription-based, paid ways to integrate different systems, and they offer differing amounts of customizability. They will usually sync in both directions, so in this case from WordPress to Salesforce and vice versa. The only limitations of something like this are the cost over time, and the possible vulnerability of basing an integration on a third party that could, at some point, go away.
- [Visualforce](https://developer.salesforce.com/page/An_Introduction_to_Visualforce) If you are or have a Salesforce developer, you can build MVC based applications that integrate with Salesforce. It would be possible to build a system that uses, for example, the [WordPress REST API](https://developer.wordpress.org/rest-api/) to send and receive data to and from WordPress. This could be, in many ways, the flip side of what our plugin here does, but the complexity would be the same if the scope was the same.
- **Build other integrations in WordPress** this plugin focuses on the Salesforce REST API, as it covers the integration needs we have. Salesforce also has many other developer options: the SOAP API (we hope to incorporate this into Object Sync for Salesforce at some point), the Bulk API, and the Metadata API. Developers could extend this plugin to integrate with one of these. We would welcome any pull requests!

## Developing with and for this plugin

WordPress developers can use hooks in this plugin to extend its functionality. These are listed, with links to each hook's documentation, in the [developer hooks documentation](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/all-developer-hooks.md), and are frequently mentioned throughout the plugin's [documentation](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/readme.md).

We host [a document](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/example-extending-plugins.md) intended to list plugins that use these hooks or otherwise extend this plugin, and we welcome additions.

### Contribute to this plugin

Plugin developers should know that Object Sync for Salesforce is based on the [Drupal Salesforce Suite](https://github.com/thinkshout/salesforce) (version 7.x-3.x-dev), and aims to at least reproduce that functionality while following WordPress development standards and guidelines.

We welcome contributions to this project from other developers. See our [contributing guidelines](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/contributing.md).

### Development history

All versions of this plugin are listed in the [releases](https://github.com/MinnPost/object-sync-for-salesforce/releases), and in our [changelog](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/changelog.md).

## Donating

If you'd like to support this project, MinnPost is a 501(c)(3) nonprofit news organization located in Minnesota. You can make a tax-deductible donation, and we'll attach it to our open source development work, at [https://www.minnpost.com/support/?campaign=7010G0000012fXGQAY](https://www.minnpost.com/support/?campaign=7010G0000012fXGQAY).
