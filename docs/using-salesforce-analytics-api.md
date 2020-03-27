# Using the Salesforce Analytics API

Usage of this feature is very specific to how reporting works in a given Salesforce setup, but we've tried to provide a foundation of information. Important: with this plugin alone, Report data is not permantly stored in WordPress (it will/will not be cached according to your WordPress cache settings) with this integration, but this would be possible to build with additional plugins.

Currently, the plugin supports running a Salesforce Report, and retrieving data from it, in two ways:

1. `analytics_api()`: Make an API call to any Salesforce Analytics URL. It follows this pattern: `/analytics/{$name}/{$id}/{$route}`.
2. `run_analytics_report`: Run a Report based on its ID. This requires calling the [Salesforce API object](./accessing-salesforce-object.md).

Both methods send the URL and parameters to the plugin's `api_call()` method where it is called. This is where JSON processing, caching, logging, error handling, etc. happens. The JSON result of this method is similar to other API call methods.

Assuming you have the plugin's Salesforce API object in the `$salesforce_api` variable, it works like this:

```php
$salesforce_api->run_analytics_report(
    $id,
    $async, // boolean
    $clear_cache, // boolean. set to true if there is or might be a cache that has to be cleared
    $params = array(),
    $method = 'GET', // depending on the request, can be get or post
    $report_cache_expiration = '', // how long to keep a cached report
    $cache_instance, // whether or not to cache the instance result
    $instance_cache_expiration // how long to cache an instance of a report
);
```

The `run_analytics_report` method will do the following steps:

1. Generate the URL where this Report's instances should be found, based on its ID.
2. Check to see if there is already a cached instance, and return it if there is.
3. Check to see if this is an asynchronous request. If it is not, go to #4. If it is, go to #8.
4. Send a GET request to the Report URL with ?includeDetails=true to get an array of parameters for the instances URL.
5. Send a POST request to the instances URL to get the instance ID.
6. Run the Report again if there are no instances (this happens if the report is currently running).
7. Cache the instance if the settings indicate that it should.
8. Make a default API call to the instance ID from #5. Run it again if it 404s (similar to #6).
9. Cache the instance if the settings indicate that it should.
10. Return whatever the result is.

As mentioned, there is an [example plugin](https://github.com/minnpost/minnpost-donation-progress-widget) that creates a widget, using a Report ID and a Campaign ID, to display current donation drive status as a thermometer. Even if it is not useful for your Salesforce install, it may be helpful to see how the code works.
