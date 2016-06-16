# Salesforce REST API
Defines an API that enables WordPress to interact with the Salesforce REST API. This is based on the [Drupal Salesforce Suite](https://github.com/thinkshout/salesforce) (version 7.x-3.x-dev), but strives to use WordPress conventions rather than Drupal's whenever possible.

## About
This plugin creates a mapping functionality between Salesforce objects and WordPress content types. For any supported WordPress content types (e.g. post, page, user, or any custom content type in your installation), you can assign Salesforce objects that will be created / updated when the data in WordPress is saved. For each such assignment, you choose which WordPress and Salesforce fields should be mapped to one another.

This suite also includes an API architecture which allows for additional plugins to be easily plugged in (e.g. for webforms, contact form submits, etc).
  
For a more detailed description of each component class, see below.

## Requirements

1. You need a Salesforce account. Developers can register at [http://www.developerforce.com/events/regular/registration.php](http://www.developerforce.com/events/regular/registration.php)
2. You will need to create a remote application/connected app for authorization. In Salesforce go to Your Name > Setup > Create > Apps then create a new Connected App. Set the callback URL to: https://<your site>/salesforce/oauth_callback (must use SSL)

Select at least 'Perform requests on your behalf at any time' for OAuth Scope as well as the appropriate other scopes for your application.

Additional information: [https://help.salesforce.com/help/doc/en/remoteaccess_about.htm](https://help.salesforce.com/help/doc/en/remoteaccess_about.htm)

3. Your site needs to be SSL enabled to authorize the remote application using OAUTH.
4. If using the SOAP API, PHP to have been compiled with SOAP web services and
  OpenSSL support, as per:
  
  http://php.net/soap
  http://php.net/openssl

## Classes:

Salesforce (salesforce):
    OAUTH2 authorization and wrapper around the Salesforce REST API.

Salesforce Mapping (salesforce_mapping)
    Map WordPress content (including users) to Salesforce fields, including field level mapping.

Salesforce Push (salesforce_push):
    Push WordPress data updates into Salesforce.

  Salesforce Pull (salesforce_pull):
    Pull Salesforce object updates into WordPress.

TODO:
    Salesforce Soap (salesforce_soap):
        Lightweight wrapper around the SOAP API, using the OAUTH access token, to fill in functional gaps missing in the REST API. Requires the Salesforce PHP Toolkit.

## Notes:

