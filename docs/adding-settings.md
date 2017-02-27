# Adding settings

Developers can extend the settings interface for this plugin in a couple of ways. This allows you to, for example, add another tab in addition to the defaults: Settings, Authorize, Fieldmaps, Scheduling, and Log Settings.

## Add a settings tab

Use the `salesforce_rest_api_settings_tabs` hook to add a tab to the Salesforce settings.

### Visual example

At MinnPost, we have a plugin that extends this plugin in several ways. Most of them are not visible in the interface, but one that is allows us to tell the plugin the name of a non-member (a user who does not donate). This is tied to various permission activities on the site.

We have a settings panel that tells the plugin what this user is called, and we add a tab to do it. This allows the setting to belong with the other Salesforce settings on which it depends.

![WordPress example of additional settings tab](./assets/img/screenshots/04-wordpress-add-settings-tab.png)

Within this plugin, we can add any additional settings (or functionality) without affecting the Salesforce plugin's codebase.

### Code example

The code takes two steps: one to add the tab, and one to populate it.

#### Hook

```
add_filter( 'salesforce_rest_api_settings_tabs', minnpost_tabs', 10, 1 );
function minnpost_tabs( $tabs ) {
    $tabs['minnpost'] = 'MinnPost';
    return $tabs;
}
```

Populating the settings tab is unrelated to this plugin, so you can do it with the default WordPress Settings API, or with any other supported method.

#### Settings API

```
add_action( 'admin_init', 'minnpost_salesforce_settings_forms' );
function minnpost_salesforce_settings_forms() {
    $page = isset( $_GET['tab'] ) ? $_GET['tab'] : 'settings';
    $section = isset( $_GET['tab'] ) ? $_GET['tab'] : 'settings';
    $input_callback_default = 'display_input_field';
    $input_checkboxes_default = 'display_checkboxes';
    fields_minnpost_settings(
        'minnpost',
        'minnpost',
        array(
            'text' => $input_callback_default,
            'checkboxes' => $input_checkboxes_default
        )
    );
}
```

This `minnpost_salesforce_settings_forms` method is only part of our Settings API implementation. The rest is beyond the scope of this plugin, but the entire plugin [is viewable in our GitHub](https://github.com/MinnPost/minnpost-wordpress-salesforce-plugin).

## Modify existing settings tabs

This plugin also contains hooks for modifying the existing settings tabs for the plugin:

1. Change the template that is loaded for any/all of the settings tabs.
2. Add content above or below the default content, on any/all of the settings tabs.

### Change the template

The contents for the admin settings tabs are displayed in PHP templates. The default is `/templates/admin/settings.php` in this plugin's folder.

```
<form method="post" action="options.php">
    <?php
        echo settings_fields( $tab ) . do_settings_sections( $tab );
        submit_button( 'Save settings' );
    ?>
</form>
```

To change this, use the `salesforce_rest_api_settings_tab_include_settings` hook.

#### Code example

