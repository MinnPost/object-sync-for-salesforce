# Object Sync for Salesforce

[![Build Status](https://travis-ci.org/MinnPost/object-sync-for-salesforce.svg?branch=master)](https://travis-ci.org/MinnPost/object-sync-for-salesforce) [![Code Climate](https://codeclimate.com/github/MinnPost/object-sync-for-salesforce/badges/gpa.svg)](https://codeclimate.com/github/MinnPost/object-sync-for-salesforce) [![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/MinnPost/object-sync-for-salesforce/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/MinnPost/object-sync-for-salesforce/?branch=master)

This is a WordPress plugin that maps and syncs data between Salesforce objects and WordPress objects. It is based on the [Drupal Salesforce Suite](https://github.com/thinkshout/salesforce) (version 7.x-3.x-dev), but works in a very WordPress way.

Below is summary information, but you can also access [full documentation](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/readme.md).

## About

This plugin maps and syncs data between Salesforce objects and WordPress content types. For any supported WordPress content types (e.g. post, page, user, or any custom content type in your installation), you can assign Salesforce objects that will be created / updated / deleted when the data in WordPress is saved, and the WordPress objects can be created / updated / deleted when the data in Salesforce is saved.

Both of these directions act upon any matching data that is created after the plugin is installed. For each such assignment, you choose which WordPress and Salesforce fields should be mapped to one another.

This plugin also includes developer hooks that allow for additional plugins to modify what data the plugin is working with, or what happens upon specific events.

For a more detailed description of each component class, see below.

## Why use this plugin

This plugin is useful in a different way than other options for connecting WordPress and Salesforce because it is capable of syncing the full structure of both systems, using the capabilities of both the **WordPress database object** and the **Salesforce REST API** to create, read, update, and delete data in either system and keep it in sync with the other.

But there are other sync options as well, depending on what features you need and what capabilities you have. Always use what fits your need.

Some other options:

- [WordPress-to-Lead for Salesforce CRM](https://appexchange.salesforce.com/listingDetail?listingId=a0N30000003GxgkEAC) can be installed through the Salesforce AppExchange. It allows you to run a contact form which users on your WordPress site can submit, and the results are added to Salesforce as a Lead object.
- [Brilliant Web-to-Lead for Salesforce](https://wordpress.org/plugins/salesforce-wordpress-to-lead/) can be installed through the WordPress plugin directory. This is rather similar to the first option, but is a bit more customizable. By customizable, you can select the fields in WordPress and theme it in your WordPress theme.
- [Gravity Forms Salesforce Add-on](https://wordpress.org/plugins/gravity-forms-salesforce/) can be installed through the WordPress plugin directory. It is quite powerful, as it can send form submissions from your WordPress site to Salesforce as whatever object you need. It's important to mention that this works for any form created with the [Gravity Forms](http://www.gravityforms.com/) plugin. It's also important to mention that this does not sync data back from Salesforce into Wordpress.
- **Third party integration apps** such as [Zapier](https://zapier.com/) are subscription-based, paid ways to integrate different systems, and they offer differing amounts of customizability. They will usually sync in both directions, so in this case from WordPress to Salesforce and vice versa. The only limitations of something like this are the cost over time, and the possible vulnerability of basing an integration on a third party that could, at some point, go away.
- [Visualforce](https://developer.salesforce.com/page/An_Introduction_to_Visualforce) If you are or have a Salesforce developer, you can build MVC based applications that integrate with Salesforce. It would be possible to build a system that uses, for example, the [WordPress REST API](https://developer.wordpress.org/rest-api/) to send and receive data to and from WordPress. This could be, in many ways, the flip side of what our plugin here does, but the complexity would be the same if the scope was the same.
- **Build other integrations in WordPress** this plugin focuses on the Salesforce REST API, as it covers the integration needs we have. Salesforce also has many other developer options: the SOAP API (we hope to incorporate this at some point), the Bulk API, and the Metadata API. You could possibly extend what we use in this plugin to integrate with one of these. Feel free to submit a pull request if you do!

## Requirements

1. A PHP installation of at least version 5.5.
2. SSL support.
3. A Salesforce account. Developers can register for a free Developer Edition account at [https://developer.salesforce.com/signup](https://developer.salesforce.com/signup)
4. A remote application/connected Salesforce app for authorization.

## Installation and setup

You can find a detailed [initial setup instruction](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/initial-setup.md) document for this plugin. Most users will want to install the plugin from the [WordPress plugin repository](https://wordpress.org/plugins/object-sync-for-salesforce/), and then follow the documentation for activating and configuring the plugin.

## Developer hooks

This plugin contains many hooks to allow other WordPress plugins to extend the functionality. It aims to reproduce all hooks provided by the Drupal suite. It also includes many additional hooks that give WordPress developers additional functionality.

There is a full list of all hooks, with links to each hook's documentation, in the [developer hooks documentation](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/all-developer-hooks.md) page.

We also host [a document](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/example-extending-plugins.md) intended to list plugins that use these hooks.

## Development

If you'd like to contribute to this project, please see our [contributing guidelines](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/contributing.md). If you build other plugins that use the developer hooks, please contribute to the [list](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/docs/example-extending-plugins.md).

## Changelog

We maintain a separate [changelog](https://github.com/MinnPost/object-sync-for-salesforce/blob/master/changelog.md) document.

## Donate

If you'd like to support this project, MinnPost is a 501(c)(3) nonprofit news organization in Minnesota. You can make a tax-deductible donation, and we'll attach it to our open source development work, at [https://www.minnpost.com/support/?campaign=7010G0000012fXGQAY](https://www.minnpost.com/support/?campaign=7010G0000012fXGQAY).
