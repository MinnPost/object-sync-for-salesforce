<?php

if ( ! class_exists( 'Salesforce_Rest_API' ) ) {
    die();
}

class Wordpress_Salesforce_Admin {

    protected $wpdb;
    protected $version;
    protected $login_credentials;
    protected $text_domain;
    protected $salesforce;
    protected $wordpress;
    protected $mappings;
    protected $schedulable_classes;

    /**
    * Create default WordPress admin functionality for Salesforce
    *
    * @param object $wpdb
    * @param string $version
    * @param array $login_credentials
    * @param string $text_domain
    * @param object $wordpress
    * @param object $salesforce
    * @param object $mappings
    * @param object $logging
    * @param array $schedulable_classes
    * @throws \Exception
    */
    public function __construct( $wpdb, $version, $login_credentials, $text_domain, $wordpress, $salesforce, $mappings, $logging, $schedulable_classes ) {
        $this->wpdb = &$wpdb;
        $this->version = $version;
        $this->login_credentials = $login_credentials;
        $this->text_domain = $text_domain;
        $this->wordpress = $wordpress;
        $this->salesforce = $salesforce;
        $this->mappings = $mappings;
        $this->logging = $logging;
        $this->schedulable_classes = $schedulable_classes;

        // todo: we should think about what kind of admin_notices to use, if any
        // https://codex.wordpress.org/Plugin_API/Action_Reference/admin_notices

        // todo: we need a way to show the salesforce data and trigger automatic actions from the admin view of the user profile

        $this->add_actions();

        // we can map objects to salesforce that are not 'posts' but we need to tell the plugin what they are
        // this can be done when calling this class, or here as a default

    }

    /**
    * Create the action hooks to create the admin page(s)
    * todo: maybe we should make this extensible by other plugins
    *
    */
    public function add_actions() {
        add_action( 'admin_init', array( &$this, 'salesforce_settings_forms' ) );
        add_action( 'admin_post_post_fieldmap', array( &$this, 'prepare_fieldmap_data' ) );
        add_action( 'admin_notices', array( &$this, 'fieldmap_error_notice' ) );
        add_action( 'admin_post_delete_fieldmap', array( &$this, 'delete_fieldmap' ) );
        add_action( 'wp_ajax_get_salesforce_object_description', array( $this, 'get_salesforce_object_description' ) );
        add_action( 'wp_ajax_get_wordpress_object_description', array( $this, 'get_wordpress_object_fields' ) );
        add_action( 'wp_ajax_get_wp_sf_object_fields', array( $this, 'get_wp_sf_object_fields' ) );
    }

    /**
    * Create WordPress admin options page
    *
    */
    public function create_admin_menu() {
        $title = __('Salesforce','salesforce-api');
        add_options_page( $title, $title, 'manage_options', 'salesforce-api-admin', array( &$this, 'show_admin_page', ) );
    }

    /**
    * Render full admin pages in WordPress
    * This allows other plugins to add tabs to the Salesforce settings screen
    *
    * todo: maybe create separate html template/views for this
    * todo: do some better css so it doesn't look awful
    *
    */ 
    public function show_admin_page() {
        echo '<div class="wrap">';
        echo '<h1>' . get_admin_page_title() . '</h1>';
        $tabs = array(
            'settings' => 'Settings',
            'authorize' => 'Authorize',
            'fieldmaps' => 'Fieldmaps',
            'schedule' => 'Scheduling',
        ); // this creates the tabs for the admin

        // optionally make tab(s) for logging and log settings
        $logging_enabled = get_option( 'salesforce_api_enable_logging', FALSE );
        if ( $logging_enabled === '1' ) {
            $tabs['log_settings'] = 'Log Settings';
        }

        // filter for extending the tabs available on the page
        // currently it will go into the default switch case for $tab
        $tabs = apply_filters( 'salesforce_rest_api_settings_tabs', $tabs );

        $tab = isset( $_GET['tab'] ) ? $_GET['tab'] : 'settings';
        $this->tabs( $tabs, $tab );

        // todo: figure out what exact permissions to require here, and maybe use an admin notice and a redirect for users who don't have those permissions
        if ( ! current_user_can('manage_options') ) {
            return;
        }

        $consumer_key = $this->login_credentials['consumer_key'];
        $consumer_secret = $this->login_credentials['consumer_secret'];
        $callback_url = $this->login_credentials['callback_url'];
        $text_domain = $this->text_domain;

        try {
            switch ( $tab ) {
                case 'authorize':
                    if ( isset( $_GET['code'] ) )  {
                        $is_authorized = $this->salesforce['sfapi']->request_token( esc_attr( $_GET['code'] ) );
                        echo "<script>window.location = '$callback_url';</script>";
                    } elseif ( $this->salesforce['is_authorized'] === true ) {
                        echo '<div class="success"><h2>Salesforce is successfully authenticated.</h2></div>';
                        echo '<p><a class="button-primary" href="' . $callback_url . '&amp;tab=logout">Disconnect from Salesforce</a></p>';
                        $demo = $this->demo( $this->salesforce['sfapi'] );
                        echo $demo;
                    } elseif ( isset( $consumer_key ) && isset( $consumer_secret ) ) {
                        echo '<p><a class="button-primary" href="' . $this->salesforce['sfapi']->get_authorization_code() . '">' . esc_html__( 'Connect to Salesforce', $this->text_domain ) . '</a></p>';
                    } // need to throw an error here if all the stuff is missing
                    break;
                case 'fieldmaps':
                    if ( isset( $_GET['method'] ) ) {
                        $method = esc_attr( $_GET['method'] );
                        $error_url = get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=' . $method );
                        $success_url = get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps' );

                        if ( isset( $_GET['transient'] ) ) {
                            $transient = esc_html( $_GET['transient'] );
                            $posted = get_transient( $transient );
                        }

                        if ( isset( $posted ) && is_array( $posted ) ) {
                            $map = $posted;
                        } elseif ( $method === 'edit' || $method === 'clone' || $method === 'delete' ) {
                            $map = $this->mappings->get_fieldmaps( $_GET['id'] );
                        }

                        if ( isset( $map ) && is_array( $map ) ) {
                            $label = $map['label'];
                            $salesforce_object = $map['salesforce_object'];
                            $salesforce_record_types_allowed = maybe_unserialize( $map['salesforce_record_types_allowed'] );
                            $salesforce_record_type_default = $map['salesforce_record_type_default'];
                            $wordpress_object = $map['wordpress_object'];
                            $pull_trigger_field = $map['pull_trigger_field'];
                            $fieldmap_fields = $map['fields'];
                            $sync_triggers = $map['sync_triggers'];
                            $push_async = $map['push_async'];
                            $ignore_drafts = $map['ignore_drafts'];
                            $weight = $map['weight'];
                        }
                        
                        if ( $method === 'add' || $method === 'edit' || $method === 'clone' ) { ?>
                        <form method="post" action="<?php echo admin_url( 'admin-post.php' ); ?>" class="fieldmap">
                            <input type="hidden" name="redirect_url_error" value="<?php echo $error_url; ?>" />
                            <input type="hidden" name="redirect_url_success" value="<?php echo $success_url; ?>" />
                            <?php
                            if ( isset( $transient ) ) {
                            ?>
                            <input type="hidden" name="transient" value="<?php echo $transient; ?>" />
                            <?php    
                            }
                            ?>
                            <input type="hidden" name="action" value="post_fieldmap" >
                            <input type="hidden" name="method" value="<?php echo $method; ?>" />
                            <?php if ( $method === 'edit' ) {
                            ?>
                            <input type="hidden" name="id" value="<?php echo $map['id']; ?>" />
                            <?php
                            }
                            ?>
                            <div class="fieldmap_label">
                                <label for="label">Label: </label>
                                <input type="text" id="label" name="label" required value="<?php echo isset( $label ) ? $label : ''; ?>" />
                            </div>
                            <fieldset class="wordpress_side">
                                <div class="wordpress_object">
                                    <label for="wordpress_object">WordPress Object: </label>
                                    <select id="wordpress_object" name="wordpress_object" required>
                                        <option value="">- Select object type -</option>
                                        <?php
                                        $wordpress_objects = $this->wordpress->wordpress_objects;
                                        foreach ( $wordpress_objects as $object ) {
                                            if ( isset( $wordpress_object ) && $wordpress_object === $object ) {
                                                $selected = ' selected';
                                            } else {
                                                $selected = '';
                                            }
                                            echo '<option value="' . $object . '"' . $selected . '>' . $object . '</option>';
                                        }
                                        ?>
                                    </select>
                                </div>
                            </fieldset>
                            <fieldset class="salesforce_side">
                                <div class="salesforce_object">
                                    <label for="salesforce_object">Salesforce Object: </label>
                                    <div class="spinner"></div>
                                    <select id="salesforce_object" name="salesforce_object" required>
                                        <option value="">- Select object type -</option>
                                        <?php
                                        $sfapi = $this->salesforce['sfapi'];
                                        $salesforce_objects = $sfapi->objects();
                                        foreach ( $salesforce_objects as $object ) {
                                            if ( isset( $salesforce_object ) && $salesforce_object === $object['name'] ) {
                                                $selected = ' selected';
                                            } else {
                                                $selected = '';
                                            }
                                            echo '<option value="' . $object['name'] . '"' . $selected . '>' . $object['label'] . '</option>';
                                        }
                                        ?>
                                    </select>
                                </div>
                                <div class="salesforce_record_types_allowed">
                                    <?php
                                    if ( isset( $salesforce_record_types_allowed ) ) {
                                        $record_types = $this->get_salesforce_object_description( array( 'salesforce_object' => $salesforce_object, 'include' => 'recordTypeInfos' ) );
                                        if ( isset( $record_types['recordTypeInfos'] ) ) {
                                            echo '<label for="salesforce_record_types_allowed">Allowed Record Types:</label>';
                                            echo '<div class="checkboxes">';
                                            foreach ( $record_types['recordTypeInfos'] as $key => $value ) {
                                                if ( in_array( $key, $salesforce_record_types_allowed ) ) {
                                                    $checked = ' checked';
                                                } else {
                                                    $checked = '';
                                                }
                                                echo '<label><input type="checkbox" class="form-checkbox" value="' . $key . '" name="salesforce_record_types_allowed[' . $key . ']" id="salesforce_record_types_allowed-' . $key . '" ' . $checked . '> ' . $value . '</label>';
                                            }
                                            echo '</div>';
                                        }
                                    }
                                    ?>
                                </div>
                                <div class="salesforce_record_type_default">
                                    <?php
                                    if ( isset( $salesforce_record_type_default ) ) {
                                        $record_types = $this->get_salesforce_object_description( array( 'salesforce_object' => $salesforce_object, 'include' => 'recordTypeInfos' ) );
                                        if ( isset( $record_types['recordTypeInfos'] ) ) {
                                            echo '<label for="salesforce_record_type_default">Default Record Type:</label>';
                                            echo '<select id="salesforce_record_type_default" name="salesforce_record_type_default" required><option value="">- Select record type -</option>';
                                            foreach ( $record_types['recordTypeInfos'] as $key => $value ) {
                                                if ( isset( $salesforce_record_type_default ) && $salesforce_record_type_default === $key ) {
                                                    $selected = ' selected';
                                                } else {
                                                    $selected = '';
                                                }
                                                if ( !isset( $salesforce_record_types_allowed ) || in_array( $key, $salesforce_record_types_allowed ) ) {
                                                    echo '<option value="' . $key . '"' . $selected . '>' . $value . '</option>';
                                                }
                                            }
                                            echo '</select>';
                                        }
                                    }
                                    ?>
                                </div>
                                <div class="pull_trigger_field">
                                    <?php
                                    if ( isset( $pull_trigger_field ) ) {
                                        echo '<label for="pull_trigger_field">Date field to trigger pull:</label>';
                                        $object_fields = $this->get_salesforce_object_fields( array('salesforce_object' => $salesforce_object, 'type' => 'datetime' ) );
                                        echo '<select name="pull_trigger_field" id="pull_trigger_field">';
                                        foreach( $object_fields as $key => $value ) {
                                            if ( $pull_trigger_field === $value['name'] ) {
                                                $selected = ' selected';
                                            } else {
                                                $selected = '';
                                            }
                                            echo '<option value="' . $value['name'] . '" ' . $selected . '>' . $value['label'] . '</option>';
                                        }
                                        echo '</select>';
                                    }
                                    ?>
                                </div>
                            </fieldset>
                            <fieldset class="fields">
                                <legend>Fieldmap</legend>
                                <table class="wp-list-table widefat striped fields">
                                    <thead>
                                        <tr>
                                            <th class="column-wordpress_field">WordPress Field</th>
                                            <th class="column-salesforce_field">Salesforce Field</th>
                                            <th class="column-is_prematch">Prematch</th>
                                            <th class="column-is_key">Salesforce Key</th>
                                            <th class="column-direction">Direction</th>
                                            <th class="column-is_delete">Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php
                                        if ( isset( $fieldmap_fields ) && $fieldmap_fields !== NULL && is_array( $fieldmap_fields ) ) {
                                            foreach ( $fieldmap_fields as $key => $value ) {
                                        ?>
                                        <tr>
                                            <td class="column-wordpress_field">
                                                <select name="wordpress_field[<?php echo $key; ?>]" id="wordpress_field-<?php echo $key; ?>">
                                                    <option value="">- Select WordPress field -</option>
                                                    <?php
                                                    $wordpress_fields = $this->get_wordpress_object_fields( $wordpress_object );
                                                    foreach ( $wordpress_fields as $wordpress_field ) {
                                                        if ( isset( $value['wordpress_field']['label'] ) && $value['wordpress_field']['label'] === $wordpress_field['key'] ) {
                                                            $selected = ' selected';
                                                        } else {
                                                            $selected = '';
                                                        }
                                                        echo '<option value="' . $wordpress_field['key'] . '"' . $selected . '> ' . $wordpress_field['key'] . '</option>';
                                                    }
                                                    ?>
                                                </select>
                                                
                                            </td>
                                            <td class="column-salesforce_field">
                                                <select name="salesforce_field[<?php echo $key; ?>]" id="salesforce_field-<?php echo $key; ?>">
                                                    <option value="">- Select Salesforce field -</option>
                                                    <?php
                                                    $salesforce_fields = $this->get_salesforce_object_fields( array('salesforce_object' => $salesforce_object ) );
                                                    foreach ( $salesforce_fields as $salesforce_field ) {
                                                        if ( isset( $value['salesforce_field'] ) && $value['salesforce_field'] === $salesforce_field['name'] ) {
                                                            $selected = ' selected';
                                                        } else {
                                                            $selected = '';
                                                        }
                                                        echo '<option value="' . $salesforce_field['name'] . '"' . $selected . '> ' . $salesforce_field['label'] . '</option>';
                                                    }
                                                    ?>
                                                </select>
                                                
                                            </td>
                                            <td class="column-is_prematch">
                                                <?php
                                                if ( isset( $value['is_prematch'] ) && $value['is_prematch'] === '1' ) {
                                                    $checked = ' checked';
                                                } else {
                                                    $checked = '';
                                                }
                                                ?>
                                                <input type="checkbox" name="is_prematch[<?php echo $key; ?>]" id="is_prematch-<?php echo $key; ?>" value="1" <?php echo $checked; ?> title="This pair should be checked for existing matches in Salesforce before adding" />
                                            </td>
                                            <td class="column-is_key">
                                                <?php
                                                if ( isset( $value['is_key'] ) && $value['is_key'] === '1' ) {
                                                    $checked = ' checked';
                                                } else {
                                                    $checked = '';
                                                }
                                                ?>
                                                <input type="checkbox" name="is_key[<?php echo $key; ?>]" id="is_key-<?php echo $key; ?>" value="1" <?php echo $checked; ?> title="This Salesforce field is an External ID in Salesforce" />
                                            </td>
                                            <td class="column-direction">
                                                <?php
                                                if ( isset( $value['direction'] ) ) {
                                                    if ( $value['direction'] === 'sf_wp' ) {
                                                        $checked_sf_wp = ' checked';
                                                        $checked_wp_sf = '';
                                                        $checked_sync = '';
                                                    } elseif ( $value['direction'] === 'wp_sf' ) {
                                                        $checked_sf_wp = '';
                                                        $checked_wp_sf = ' checked';
                                                        $checked_sync = '';
                                                    } else {
                                                        $checked_sf_wp = '';
                                                        $checked_wp_sf = '';
                                                        $checked_sync = ' checked';
                                                    }
                                                } else {
                                                    $checked_sf_wp = '';
                                                    $checked_wp_sf = '';
                                                    $checked_sync = ' checked'; // by default, start with Sync checked
                                                }
                                                
                                                ?>
                                                <div class="radios">
                                                    <label><input type="radio" value="sf_wp" name="direction[<?php echo $key; ?>]" id="direction-<?php echo $key; ?>-sf-wp" <?php echo $checked_sf_wp; ?> required>  Salesforce to WordPress</label>
                                                    <label><input type="radio" value="wp_sf" name="direction[<?php echo $key; ?>]" id="direction-<?php echo $key; ?>-wp-sf" <?php echo $checked_wp_sf; ?> required>  WordPress to Salesforce</label>
                                                    <label><input type="radio" value="sync" name="direction[<?php echo $key; ?>]" id="direction-<?php echo $key; ?>-sync" <?php echo $checked_sync; ?> required>  Sync</label>
                                                </div>
                                            </td>
                                            <td class="column-is_delete">
                                                <input type="checkbox" name="is_delete[<?php echo $key; ?>]" id="is_delete-<?php echo $key; ?>" value="1" />
                                            </td>
                                        </tr>
                                        <?php
                                            }   
                                        } elseif ( isset( $wordpress_object ) && isset( $salesforce_object ) ) {
                                        ?>
                                        <tr>
                                            <td class="column-wordpress_field">
                                                <select name="wordpress_field[0]" id="wordpress_field-0">
                                                    <option value="">- Select WordPress field -</option>
                                                    <?php
                                                    $wordpress_fields = $this->get_wordpress_object_fields( $wordpress_object );
                                                    foreach ( $wordpress_fields as $wordpress_field ) {
                                                        echo '<option value="' . $wordpress_field['key'] . '"> ' . $wordpress_field['key'] . '</option>';
                                                    }
                                                    ?>
                                                </select>
                                            </td>
                                            <td class="column-salesforce_field">
                                                <select name="salesforce_field[0]" id="salesforce_field-0">
                                                    <option value="">- Select Salesforce field -</option>
                                                    <?php
                                                    $salesforce_fields = $this->get_salesforce_object_fields( array('salesforce_object' => $salesforce_object ) );
                                                    foreach ( $salesforce_fields as $salesforce_field ) {
                                                        echo '<option value="' . $salesforce_field['name'] . '"> ' . $salesforce_field['label'] . '</option>';
                                                    }
                                                    ?>
                                                </select>
                                            </td>
                                            <td class="column-is_prematch">
                                                <input type="checkbox" name="is_prematch[0]" id="is_prematch-0" value="1" />
                                            </td>
                                            <td class="column-is_key">
                                                <input type="checkbox" name="is_key[0]" id="is_key-0" value="1" />
                                            </td>
                                            <td class="column-direction">
                                                <div class="radios">
                                                    <label><input type="radio" value="sf_wp" name="direction[0]" id="direction-0-sf-wp" required>  Salesforce to WordPress</label>
                                                    <label><input type="radio" value="wp_sf" name="direction[0]" id="direction-0-wp-sf" required>  WordPress to Salesforce</label>
                                                    <label><input type="radio" value="sync" name="direction[0]" id="direction-0-sync" required checked>  Sync</label>
                                                </div>
                                            </td>
                                            <td class="column-is_delete">
                                                <input type="checkbox" name="is_delete[0]" id="is_delete-0" value="1" />
                                            </td>
                                        </tr>
                                        <?php
                                        }
                                        ?>
                                    </tbody>
                                </table>
                                <!--<div class="spinner"></div>-->
                                <?php
                                if ( isset( $fieldmap_fields ) && $fieldmap_fields !== NULL ) {
                                    $add_button_label = 'Add another field mapping';
                                } else {
                                    $add_button_label = 'Add field mapping';
                                }
                                ?>
                                <p><button type="button" id="add-field-mapping" class="button button-secondary"><?php echo $add_button_label; ?></button></p>
                                <p class="description">Prematch tells the plugin to match records that have the same value before sending data to Salesforce. Salesforce Key indicates the Salesforce field is an External ID. If either of these is checked, the plugin will do an UPSERT to avoid duplicate data when possible.</p>
                            </fieldset>
                            <fieldset class="sync_triggers">
                                <legend>Action triggers</legend>
                                <div class="checkboxes">
                                    <?php
                                    $wordpress_create_checked = '';
                                    $wordpress_update_checked = '';
                                    $wordpress_delete_checked = '';
                                    $salesforce_create_checked = '';
                                    $salesforce_update_checked = '';
                                    $salesforce_delete_checked = '';
                                    if ( isset( $sync_triggers ) && is_array( $sync_triggers ) ) {
                                        foreach ( $sync_triggers as $trigger ) {
                                            switch ($trigger) {
                                                case $this->mappings->sync_wordpress_create:
                                                    $wordpress_create_checked = ' checked';
                                                    break;
                                                case $this->mappings->sync_wordpress_update:
                                                    $wordpress_update_checked = ' checked';
                                                    break;
                                                case $this->mappings->sync_wordpress_delete:
                                                    $wordpress_delete_checked = ' checked';
                                                    break;
                                                case $this->mappings->sync_sf_create:
                                                    $salesforce_create_checked = ' checked';
                                                    break;
                                                case $this->mappings->sync_sf_update:
                                                    $salesforce_update_checked = ' checked';
                                                    break;
                                                case $this->mappings->sync_sf_delete:
                                                    $salesforce_delete_checked = ' checked';
                                                    break;
                                            }
                                        }
                                    }
                                    ?>
                                    <label><input type="checkbox" value="<?php echo $this->mappings->sync_wordpress_create; ?>" name="sync_triggers[]" id="sync_triggers-wordpress-create" <?php echo $wordpress_create_checked; ?>> WordPress create</label>
                                    <label><input type="checkbox" value="<?php echo $this->mappings->sync_wordpress_update; ?>" name="sync_triggers[]" id="sync_triggers-wordpress-update" <?php echo $wordpress_update_checked; ?>>WordPress update</label>
                                    <label><input type="checkbox" value="<?php echo $this->mappings->sync_wordpress_delete; ?>" name="sync_triggers[]" id="sync_triggers-wordpress-delete" <?php echo $wordpress_delete_checked; ?>>WordPress delete</label>
                                    <label><input type="checkbox" value="<?php echo $this->mappings->sync_sf_create; ?>" name="sync_triggers[]" id="sync_triggers-salesforce-create" <?php echo $salesforce_create_checked; ?>> Salesforce create</label>
                                    <label><input type="checkbox" value="<?php echo $this->mappings->sync_sf_update; ?>" name="sync_triggers[]" id="sync_triggers-salesforce-update" <?php echo $salesforce_update_checked; ?>> Salesforce update</label>
                                    <label><input type="checkbox" value="<?php echo $this->mappings->sync_sf_delete; ?>" name="sync_triggers[]" id="sync_triggers-salesforce-delete" <?php echo $salesforce_delete_checked; ?>> Salesforce delete</label>
                                    <p class="description">Select which actions on WordPress objects and Salesforce objects should trigger a synchronization. These settings are used by the <code>salesforce_push</code> and <code>salesforce_pull</code> modules respectively.</p>
                                </div>
                                <div class="checkboxes">
                                    <label><input type="checkbox" name="push_async" id="process-async" value="1" <?php echo isset( $push_async ) && $push_async === '1' ? ' checked' : ''; ?>> Process asynchronously</label>
                                    <p class="description">If selected, push data will be queued for processing and synchronized when <code>wp_cron</code> is run. This may increase site performance, but changes will not be reflected in real time.</p>
                                </div>
                                <div class="checkboxes">
                                    <label><input type="checkbox" name="ignore_drafts" id="ignore-drafts" value="1" <?php echo isset( $ignore_drafts ) && $ignore_drafts === '1' ? ' checked' : ''; ?>> Ignore drafts</label>
                                    <p class="description">If selected, WordPress will not send drafts of this object type (if it creates drafts for it) to Salesforce.</p>
                                </div>
                                <div class="fieldmap_label">
                                    <label for="label">Weight: </label>
                                    <input type="number" id="weight" name="weight" value="<?php echo isset( $weight ) ? $weight : ''; ?>" />
                                    <p class="description">Weight is intended for use when you have multiple fieldmaps for the same object, either in WordPress or Salesforce.</p>
                                    <p class="description">For example, if you map WordPress users to Salesforce Contacts, and then map the users to Salesforce Leads as well, you could assign a numeric weight to indicate which one gets processed first. Otherwise, you can safely leave it blank.</p>
                                </div>
                            </fieldset>
                            <?php echo submit_button( ucfirst( $method ) . ' fieldmap' ); ?>
                        </form>
                        <?php 
                        } elseif ( $method === 'delete' ) {
                            ?>
                            <form method="post" action="<?php echo admin_url( 'admin-post.php' ); ?>">
                                <input type="hidden" name="redirect_url_error" value="<?php echo $error_url; ?>" />
                                <input type="hidden" name="redirect_url_success" value="<?php echo $success_url; ?>" />
                                <input type="hidden" name="id" value="<?php echo $map['id']; ?>" />
                                <input type="hidden" name="action" value="delete_fieldmap">
                                <h2>Are you sure you want to delete this fieldmap?</h2>
                                <p>This fieldmap is called <strong><?php echo $map['label']; ?></strong> and it maps the Salesforce <?php echo $map['salesforce_object']; ?> object to the WordPress <?php echo $map['wordpress_object']; ?> object.</p>
                                <?php echo submit_button( 'Confirm deletion' ); ?>
                            </form>
                            <?php
                        }
                    } else {
                        $table = '';
                        $table .= '<h3>Fieldmaps <a class="page-title-action" href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=add' ) . '">Add New</a></h3>';
                        $table .= '<table class="widefat striped"><thead><summary></summary><tr><th>Label</th><th>WordPress Object</th><th>Salesforce Object</th><th colspan="3">Actions</th></thead><tbody>';
                        $results = $this->mappings->get_fieldmaps();
                        if ( count( $results ) > 0 ) {
                            foreach ( $results as $record ) {
                                $table .= '<tr><td>' . $record['label'] . '</td><td>' . $record['wordpress_object'] . '</td><td>' . $record['salesforce_object'] . '</td><td><a href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=edit&id=' . $record['id'] ) . '">Edit</a></td><td><a href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=clone&id=' . $record['id'] ) . '">Clone</a></td><td><a href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=delete&id=' . $record['id'] ) . '">Delete</a></td><td><a href="' . get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=export&id=' . $record['id'] ) . '">Export</a></td></tr>';
                            }
                        } else {
                            $table .= '<tr><td colspan="4"><p>No fieldmaps exist yet. You can <a href="' .get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=add' ) . '">add one</a>.</p></td></tr>';
                        }
                        $table .= '</tbody></table>';
                        echo $table;

                    }
                    break;
                case 'logout':
                    $message = $this->logout();
                    echo '<p>' . $message . '</p>';
                    break;
                case 'clear_schedule':
                    if ( isset( $_GET['schedule_name'] ) )  {
                        $schedule_name = urlencode( $_GET['schedule_name'] );
                    }
                    $message = $this->clear_schedule( $schedule_name );
                    echo '<p>' . $message . '</p>';
                    break;
                case 'settings':
                    $consumer_key = $this->login_credentials['consumer_key'];
                    $consumer_secret = $this->login_credentials['consumer_secret'];

                    if ($consumer_key && $consumer_secret) {

                        if ( $this->salesforce['is_authorized'] === true ) {
                            echo '<form method="post" action="options.php">';
                                echo settings_fields( $tab ) . do_settings_sections( $tab );
                                submit_button( 'Save settings' );
                            echo '</form>';

                        } else {
                            salesforce_set_message( esc_html__( 'Salesforce needs to be authorized to connect to this website.', $this->text_domain ), 'error' );
                        }
                    } else {
                        echo '<form method="post" action="options.php">';
                            echo settings_fields( $tab ) . do_settings_sections( $tab );
                            submit_button( 'Save settings' );
                        echo '</form>';
                    }
                    break;
                default:
                    echo '<form method="post" action="options.php">';
                        echo settings_fields( $tab ) . do_settings_sections( $tab );
                        submit_button( 'Save settings' );
                    echo '</form>';
                    break;
            }

        }
        catch( SalesforceApiException $Ex ) {
            //salesforce_api_admin_render_header( $Ex->getStatus().': Error '.$Ex->getCode().', '.$Ex->getMessage(), 'error' );
            //print_r($Ex);
            echo 'Error '.$Ex->getCode().', '.$Ex->getMessage();
        }
        catch( Exception $Ex ) {
            echo 'Error '.$Ex->getCode().', '.$Ex->getMessage();
        }

        echo '</div>';

    }

    /**
    * Create default WordPress admin settings form for salesforce
    * This is for the Settings page/tab
    *
    */
    public function salesforce_settings_forms() {
        $page = isset( $_GET['tab'] ) ? $_GET['tab'] : 'settings';
        $section = isset( $_GET['tab'] ) ? $_GET['tab'] : 'settings';
        
        $input_callback_default = array( &$this, 'display_input_field' );
        $input_checkboxes_default = array( &$this, 'display_checkboxes' );
        $input_select_default = array( &$this, 'display_select' );
        $link_default = array( &$this, 'display_link' );

        $all_field_callbacks = array(
            'text' => $input_callback_default,
            'checkboxes' => $input_checkboxes_default,
            'select' => $input_select_default,
            'link' => $link_default
        );

        $this->fields_settings( 'settings', 'settings', $all_field_callbacks );
        $this->fields_fieldmaps( 'fieldmaps', 'objects' );
        $this->fields_scheduling( 'schedule', 'schedule', $all_field_callbacks );
        $this->fields_log_settings( 'log_settings', 'log_settings', $all_field_callbacks );
    }

    /**
    * Fields for the Settings tab
    * This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
    *
    * @param string $page
    * @param string $section
    * @param string $input_callback
    */
    private function fields_settings( $page, $section, $callbacks ) {
        add_settings_section( $page, ucwords( $page ), null, $page );
        $salesforce_settings = array(
            'consumer_key' => array(
                'title' => 'Consumer Key',
                'callback' => $callbacks['text'],
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'type' => 'text',
                    'desc' => '',
                    'constant' => 'SALESFORCE_CONSUMER_KEY'
                ),
                
            ),
            'consumer_secret' => array(
                'title' => 'Consumer Secret',
                'callback' => $callbacks['text'],
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'type' => 'text',
                    'desc' => '',
                    'constant' => 'SALESFORCE_CONSUMER_SECRET'
                ),
            ),
            'callback_url' => array(
                'title' => 'Callback URL',
                'callback' => $callbacks['text'],
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'type' => 'url',
                    'desc' => '',
                    'constant' => 'SALESFORCE_CALLBACK_URL'
                ),
            ),
            'login_base_url' => array(
                'title' => 'Login Base URL',
                'callback' => $callbacks['text'],
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'type' => 'url',
                    'desc' => '',
                    'constant' => 'SALESFORCE_LOGIN_BASE_URL'
                ),
            ),
            'api_version' => array(
                'title' => 'Salesforce API Version',
                'callback' => $callbacks['text'],
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'type' => 'text',
                    'desc' => '',
                    'constant' => 'SALESFORCE_API_VERSION'
                ),
            ),
            'object_filters' => array(
                'title' => 'Limit Salesforce Objects',
                'callback' => $callbacks['checkboxes'],
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'type' => 'checkboxes',
                    'desc' => 'Allows you to limit which Salesforce objects can be mapped',
                    'items' => array(
                        'triggerable' => array(
                            'text' => 'Only Triggerable objects',
                            'id' => 'triggerable',
                            'desc' => '',
                            'default' => TRUE
                        ),
                        'updateable' => array(
                            'text' => 'Only Updateable objects',
                            'id' => 'updateable',
                            'desc' => '',
                            'default' => TRUE
                        )
                    )
                )
            ),
            'pull_throttle' => array(
                'title' => 'Pull throttle (seconds)',
                'callback' => $callbacks['text'],
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'type' => 'text',
                    'desc' => 'Number of seconds to wait between repeated salesforce pulls.<br>Prevents the webserver from becoming overloaded in case of too many cron runs, or webhook usage.',
                    'constant' => ''
                ),
            ),
        );
        foreach ( $salesforce_settings as $key => $attributes ) {
            $id = 'salesforce_api_' . $key;
            $name = 'salesforce_api_' . $key;
            $title = $attributes['title'];
            $callback = $attributes['callback'];
            $page = $attributes['page'];
            $section = $attributes['section'];
            $args = array_merge(
                $attributes['args'],
                array(
                    'title' => $title,
                    'id' => $id,
                    'label_for' => $id,
                    'name' => $name
                )
            );
            add_settings_field( $id, $title, $callback, $page, $section, $args );
            register_setting( $page, $id );
        }
    }

    /**
    * Fields for the Fieldmaps tab
    * This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
    *
    * @param string $page
    * @param string $section
    * @param string $input_callback
    */
    private function fields_fieldmaps( $page, $section, $input_callback = '' ) {
        add_settings_section( $page, ucwords( $page ), null, $page );
    }

    /**
    * Fields for the Scheduling tab
    * This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
    *
    * @param string $page
    * @param string $section
    * @param string $input_callback
    */
    private function fields_scheduling( $page, $section, $callbacks ) {
        foreach ( $this->schedulable_classes as $key => $value ) {
            add_settings_section( $key, $value['label'], null, $page );
            $schedule_settings = array(
                $key . '_schedule_number' => array(
                    'title' => __( 'Run schedule every', $this->text_domain ),
                    'callback' => $callbacks['text'],
                    'page' => $page,
                    'section' => $key,
                    'args' => array(
                        'type' => 'text',
                        'desc' => '',
                        'constant' => ''
                    ),
                ),
                $key . '_schedule_unit' => array(
                    'title' => __( 'Time unit', $this->text_domain ),
                    'callback' => $callbacks['select'],
                    'page' => $page,
                    'section' => $key,
                    'args' => array(
                        'type' => 'select',
                        'desc' => '',
                        'items' => array(
                            'minutes' => array(
                                'text' => 'Minutes',
                                'value' => 'minutes',
                            ),
                            'hours' => array(
                                'text' => 'Hours',
                                'value' => 'hours',
                            ),
                            'days' => array(
                                'text' => 'Days',
                                'value' => 'days',
                            ),
                        )
                    )
                ),
                $key . '_clear_button' => array(
                    'title' => __( 'This queue has ' . $this->get_schedule_count( $key ) . ' ' . ( $this->get_schedule_count( $key ) === '1' ? 'item' : 'items' ), $this->text_domain ),
                    'callback' => $callbacks['link'],
                    'page' => $page,
                    'section' => $key,
                    'args' => array(
                        'label' => 'Clear this queue',
                        'desc' => '',
                        'url' => '?page=salesforce-api-admin&amp;tab=clear_schedule&amp;schedule_name=' . $key,
                    ),
                ),
            );
            foreach ( $schedule_settings as $key => $attributes ) {
                $id = 'salesforce_api_' . $key;
                $name = 'salesforce_api_' . $key;
                $title = $attributes['title'];
                $callback = $attributes['callback'];
                $page = $attributes['page'];
                $section = $attributes['section'];
                $args = array_merge(
                    $attributes['args'],
                    array(
                        'title' => $title,
                        'id' => $id,
                        'label_for' => $id,
                        'name' => $name
                    )
                );
                add_settings_field( $id, $title, $callback, $page, $section, $args );
                register_setting( $page, $id );
            }
        }
    }

    /**
    * Fields for the Log Settings tab
    * This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
    *
    * @param string $page
    * @param string $section
    * @param array $callbacks
    */
    private function fields_log_settings( $page, $section, $callbacks ) {
        add_settings_section( $page, ucwords( str_replace('_', ' ', $page) ), null, $page );
        $log_settings = array(
            'enable_logging' => array(
                'title' => 'Enable Logging?',
                'callback' => $callbacks['text'],
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'type' => 'checkbox',
                    'desc' => '',
                    'constant' => ''
                ),
            ),
            'statuses_to_log' => array(
                'title' => 'Statuses to log',
                'callback' => $callbacks['checkboxes'],
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'type' => 'checkboxes',
                    'desc' => 'these are the statuses to log',
                    'items' => array(
                        'error' => array(
                            'text' => 'Error',
                            'id' => 'error',
                            'desc' => ''
                        ),
                        'success' => array(
                            'text' => 'Success',
                            'id' => 'success',
                            'desc' => ''
                        ),
                        'notice' => array(
                            'text' => 'Notice',
                            'id' => 'notice',
                            'desc' => ''
                        )
                    )
                )
            ),
            'prune_logs' => array(
                'title' => 'Automatically delete old log entries?',
                'callback' => $callbacks['text'],
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'type' => 'checkbox',
                    'desc' => '',
                    'constant' => ''
                ),
            ),
            'logs_how_old' => array(
                'title' => 'Age to delete log entries',
                'callback' => $callbacks['text'],
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'type' => 'text',
                    'desc' => 'If automatic deleting is enabled, it will affect logs this old.',
                    'default' => '2 weeks',
                    'constant' => ''
                ),
            ),
            'logs_how_often_number' => array(
                'title' => __( 'Check for old logs every', $this->text_domain ),
                'callback' => $callbacks['text'],
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'type' => 'text',
                    'desc' => '',
                    'default' => '1',
                    'constant' => ''
                ),
            ),
            'logs_how_often_unit' => array(
                'title' => __( 'Time unit', $this->text_domain ),
                    'callback' => $callbacks['select'],
                    'page' => $page,
                    'section' => $section,
                    'args' => array(
                        'type' => 'select',
                        'desc' => 'These two fields are how often the site will check for logs to delete.',
                        'items' => array(
                            'minutes' => array(
                                'text' => 'Minutes',
                                'value' => 'minutes',
                            ),
                            'hours' => array(
                                'text' => 'Hours',
                                'value' => 'hours',
                            ),
                            'days' => array(
                                'text' => 'Days',
                                'value' => 'days',
                            ),
                        )
                    )
            ),
            'triggers_to_log' => array(
                'title' => 'Triggers to log',
                'callback' => $callbacks['checkboxes'],
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'type' => 'checkboxes',
                    'desc' => 'these are the triggers to log',
                    'items' => array(
                        $this->mappings->sync_wordpress_create => array(
                            'text' => 'WordPress create',
                            'id' => 'wordpress_create',
                            'desc' => ''
                        ),
                        $this->mappings->sync_wordpress_update => array(
                            'text' => 'WordPress update',
                            'id' => 'wordpress_update',
                            'desc' => ''
                        ),
                        $this->mappings->sync_wordpress_delete => array(
                            'text' => 'WordPress delete',
                            'id' => 'wordpress_delete',
                            'desc' => ''
                        ),
                        $this->mappings->sync_sf_create => array(
                            'text' => 'Salesforce create',
                            'id' => 'sf_create',
                            'desc' => ''
                        ),
                        $this->mappings->sync_sf_update => array(
                            'text' => 'Salesforce update',
                            'id' => 'sf_update',
                            'desc' => ''
                        ),
                        $this->mappings->sync_sf_delete => array(
                            'text' => 'Salesforce delete',
                            'id' => 'sf_delete',
                            'desc' => ''
                        )
                    )
                )
            ),
        );
        foreach ( $log_settings as $key => $attributes ) {
            $id = 'salesforce_api_' . $key;
            $name = 'salesforce_api_' . $key;
            $title = $attributes['title'];
            $callback = $attributes['callback'];
            $page = $attributes['page'];
            $section = $attributes['section'];
            $args = array_merge(
                $attributes['args'],
                array(
                    'title' => $title,
                    'id' => $id,
                    'label_for' => $id,
                    'name' => $name
                )
            );
            add_settings_field( $id, $title, $callback, $page, $section, $args );
            register_setting( $page, $id );
        }
    }

    /**
    * Get all the Salesforce object settings for fieldmapping
    * This takes either the $_POST array via ajax, or can be directly called with a $data array
    * 
    * @param array $data
    * data must contain a salesforce_object
    * can optionally contain a type
    * @return array $object_settings
    */
    public function get_salesforce_object_description( $data = array() ) {
        $ajax = false;
        if ( empty( $data ) ) {
            $data = $_POST;
            $ajax = true;
        }

        $object_description = array();

        if ( !empty( $data['salesforce_object'] ) ) {
            $object = $this->salesforce['sfapi']->object_describe( esc_attr( $data['salesforce_object'] ) );
            
            $object_fields = array();
            $include_record_types = array();

            // these can come from ajax
            $include = isset( $data['include'] ) ? (array) $data['include'] : array();
            $include = array_map( 'esc_attr', $include );
            
            if ( in_array( 'fields', $include ) || empty( $include ) ) {
                $type = isset( $data['field_type'] ) ? esc_attr( $data['field_type'] ) : ''; // can come from ajax
                foreach ( $object['data']['fields'] as $key => $value) {
                    if ( $type === '' || $type === $value['type'] ) {
                        $object_fields[$key] = $value;
                    }
                }
                $object_description['fields'] = $object_fields;
            }

            if ( in_array( 'recordTypeInfos', $include ) ) {
                if ( isset( $object['data']['recordTypeInfos'] ) && count( $object['data']['recordTypeInfos'] ) > 1 ) {
                    foreach ( $object['data']['recordTypeInfos'] as $type ) {
                        $object_record_types[$type['recordTypeId']] = $type['name'];
                    }
                    $object_description['recordTypeInfos'] = $object_record_types;
                }
            }
        }

        if ( $ajax === true ) {
            wp_send_json_success( $object_description );
        } else {
            return $object_description;
        }
    }

    /**
    * Get Salesforce object fields for fieldmapping
    * 
    * @param array $data
    * data must contain a salesforce_object
    * can optionally contain a type for the field
    * @return array $object_fields
    */
    public function get_salesforce_object_fields( $data = array() ) {

        if ( !empty( $data['salesforce_object'] ) ) {
            $object = $this->salesforce['sfapi']->object_describe( esc_attr( $data['salesforce_object'] ) );
            $object_fields = array();
            $type = isset( $data['type'] ) ? esc_attr( $data['type'] ) : '';
            $include_record_types = isset( $data['include_record_types'] ) ? esc_attr( $data['include_record_types'] ) : FALSE;
            foreach ( $object['data']['fields'] as $key => $value) {
                if ( $type === '' || $type === $value['type'] ) {
                    $object_fields[$key] = $value;
                }
            }
            if ( $include_record_types === TRUE ) {
                $object_record_types = array();
                if ( isset( $object['data']['recordTypeInfos'] ) && count( $object['data']['recordTypeInfos'] ) > 1 ) {
                    foreach ( $object['data']['recordTypeInfos'] as $type ) {
                        $object_record_types[$type['recordTypeId']] = $type['name'];
                    }
                }
            }
        }

        return $object_fields;

    }

    /**
    * Get WordPress object fields for fieldmapping
    * This takes either the $_POST array via ajax, or can be directly called with a $wordpress_object field
    * 
    * @param string $wordpress_object
    * @return array $object_fields
    */
    public function get_wordpress_object_fields( $wordpress_object = '' ) {
        $ajax = false;
        if ( empty( $wordpress_object ) ) {
            $wordpress_object = $_POST['wordpress_object'];
            $ajax = true;
        }
        
        $object_fields = $this->wordpress->get_wordpress_object_fields( $wordpress_object );
        
        if ( $ajax === true ) {
            wp_send_json_success( $object_fields );
        } else {
            return $object_fields;
        }
    }

    /**
    * Get WordPress and Salesforce object fields together for fieldmapping
    * This takes either the $_POST array via ajax, or can be directly called with $wordpress_object and $salesforce_object fields
    * 
    * @param string $wordpress_object
    * @param string $salesforce_object
    * @return array $object_fields
    */
    public function get_wp_sf_object_fields( $wordpress_object = '', $salesforce = '' ) {
        if ( empty( $wordpress_object ) ) {
            $wordpress_object = $_POST['wordpress_object'];
        }
        if ( empty( $salesforce_object ) ) {
            $salesforce_object = $_POST['salesforce_object'];
        }
        
        $object_fields['wordpress'] = $this->get_wordpress_object_fields( $wordpress_object );
        $object_fields['salesforce'] = $this->get_salesforce_object_fields( array( 'salesforce_object' => $salesforce_object ) );
        
        if ( !empty( $_POST ) ) {
            wp_send_json_success( $object_fields );
        } else {
            return $object_fields;
        }
    }

    /**
    * Prepare fieldmap data and redirect after processing
    * This runs when the create or update forms are submitted
    * It is public because it depends on an admin hook
    * It then calls the salesforce_mapping class and sends prepared data over to it, then redirects to the correct page
    * This method does include error handling, by loading the submission in a transient if there is an error, and then deleting it upon success
    * todo: figure out if this structure makes sense
    *
    */
    public function prepare_fieldmap_data() {
        $error = false;
        $cachekey = md5( json_encode( $_POST ) );
        
        if ( !isset( $_POST['label'] ) || !isset( $_POST['salesforce_object'] ) || !isset( $_POST['wordpress_object'] ) ) {
            $error = true;
        }
        if ( $error === true ) {
            set_transient( $cachekey, $_POST, 0 );
            if ( $cachekey !== '' ) {
                $url = esc_url_raw( $_POST['redirect_url_error'] ) . '&transient=' . $cachekey;
            }
        } else { // there are no errors
            // send the row to the fieldmap class
            // if it is add or clone, use the create method
            $method = esc_attr( $_POST['method'] );
            $wordpress_fields = $this->get_wordpress_object_fields( $_POST['wordpress_object'] );
            if ( $method === 'add' || $method === 'clone' ) {
                $result = $this->mappings->create_fieldmap( $_POST, $wordpress_fields );
            } elseif ( $method === 'edit' ) { // if it is edit, use the update method
                $id = esc_attr( $_POST['id'] );
                $result = $this->mappings->update_fieldmap( $_POST, $wordpress_fields, $id );
            }
            if ( $result === false ) { // if the database didn't save, it's still ane rror
                set_transient( $cachekey, $_POST, 0 );
                if ( $cachekey !== '' ) {
                    $url = esc_url_raw( $_POST['redirect_url_error'] ) . '&transient=' . $cachekey;
                }
            } else {
                if ( isset( $_POST['transient'] ) ) { // there was previously an error saved. can delete it now.
                    delete_transient( esc_attr( $_POST['transient'] ) );
                }
                // then send the user to the list of fieldmaps
                $url = esc_url_raw( $_POST['redirect_url_success'] );
            }
        }
        wp_redirect( $url );
        exit();
    }

    /**
    * Delete fieldmap data and redirect after processing
    * This runs when the delete link is clicked, after the user confirms
    * It is public because it depends on an admin hook
    * It then calls the salesforce_mapping class and the delete method
    * todo: figure out if this structure makes sense
    *
    */
    public function delete_fieldmap() {
        if ( $_POST['id'] ) {
            $result = $this->mappings->delete_fieldmap( $_POST['id'] );
            if ( $result === true ) {
                $url = esc_url_raw( $_POST['redirect_url_success'] );
            } else {
                $url = esc_url_raw( $_POST['redirect_url_error'] ) . '&id=' . $_POST['id'];
            }
            wp_redirect( $url );
            exit();
        }
    }

    /**
    * Fieldmap error notice
    * This runs if a mapping method has had an error. We could probably give it more helpful messaging.
    * It is public because it depends on the admin_notices hook
    * todo: better error messages
    *
    */
    public function fieldmap_error_notice() {
        if ( isset( $_GET['transient'] ) ) {
        ?>
        <div class="error notice">
            <p><?php _e( 'Errors kept this fieldmap from being saved.', $this->text_domain ); ?></p>
        </div>
        <?php
        }
    }

    /**
    * Default display for <input> fields
    *
    * @param array $args
    */
    public function display_input_field( $args ) {
        $type   = $args['type'];
        $id     = $args['label_for'];
        $name   = $args['name'];
        $desc   = $args['desc'];
        $checked = '';

        $class = 'regular-text';

        if ( $type === 'checkbox' ) {
            $class = 'checkbox';
        }

        if ( !defined( $args['constant'] ) ) {
            $value  = esc_attr( get_option( $id, '' ) );
            if ( $type === 'checkbox' ) {
                if ( $value === '1' ) {
                    $checked = 'checked ';
                }
                $value = 1;
            }
            if ( $value === '' && isset( $args['default'] ) && $args['default'] !== '' ) {
                $value = $args['default'];
            }
            echo '<input type="' . $type. '" value="' . $value . '" name="' . $name . '" id="' . $id . '"
            class="' . $class . ' code" ' . $checked . ' />';
            if ( $desc != '' ) {
                echo '<p class="description">' . $desc . '</p>';
            }
        } else {
            echo '<p><code>Defined in wp-config.php</code></p>';
        }
    }

    /**
    * Display for multiple checkboxes
    * Above method can handle a single checkbox as it is
    *
    * @param array $args
    */
    public function display_checkboxes( $args ) {
        $type = 'checkbox';
        $name = $args['name'];
        $options = get_option( $name );
        foreach ( $args['items'] as $key => $value ) {
            $text = $value['text'];
            $id = $value['id'];
            $desc = $value['desc'];
            $checked = '';
            if (is_array( $options ) && in_array( $key, $options ) ) {
                $checked = 'checked';
            }
            if ( isset( $value['default'] ) && $value['default'] === TRUE ) {
                $checked = 'checked';
            }
            echo '<div><label><input type="' . $type. '" value="' . $key . '" name="' . $name . '[]" id="' . $id . '" ' . $checked . ' />' . $text . '</label></div>';
            if ( $desc != '' ) {
                echo '<p class="description">' . $desc . '</p>';
            }
        }
    }

    /**
    * Display for a dropdown
    *
    * @param array $args
    */
    public function display_select( $args ) {
        $type   = $args['type'];
        $id     = $args['label_for'];
        $name   = $args['name'];
        $desc   = $args['desc'];
        $current_value = get_option( $name );
        echo '<div><select id="' . $id . '" name="' . $name . '"><option value="">- Select one -</option>';
        foreach ( $args['items'] as $key => $value ) {
            $text = $value['text'];
            $value = $value['value'];
            $selected = '';
            if ( $key === $current_value ) {
                $selected = ' selected';
            }
            echo '<option value="' . $value . '"' . $selected . '>' . $text . '</option>';
        }
        echo '</select>';
        if ( $desc != '' ) {
            echo '<p class="description">' . $desc . '</p>';
        }
        echo '</div>';
    }

    /**
    * Default display for <a href> links
    *
    * @param array $args
    */
    public function display_link( $args ) {
        $label   = $args['label'];
        $desc   = $args['desc'];
        $url = $args['url'];

        echo '<p><a class="button-primary" href="' . $url . '">' . $label . '</a></p>';

        if ( $desc != '' ) {
            echo '<p class="description">' . $desc . '</p>';
        }

    }

    /**
    * Run a demo of Salesforce API call on the authenticate tab after WordPress has authenticated with it
    * todo: figure out if we should create some template files for this
    *
    * @param object $sfapi
    */
    private function demo( $sfapi ) {
        $demo = '';
        $demo .= '<h3>Salesforce Demo</h3>';

        $demo .= '<p>Currently, we are using version ' . $this->login_credentials['rest_api_version'] . ' of the Salesforce REST API. Available versions are displayed below.';
        $versions = $sfapi->get_api_versions();
        $response = $versions['data'];

        // format this array into html so users can see the versions

        $is_cached = $versions['cached'] === true ? '' : 'not ';
        $from_cache = $versions['from_cache'] === true ? 'were' : 'were not';
        $is_redo = $versions['is_redo'] === true ? '' : 'not ';
        $andorbut = $versions['from_cache'] === true ? 'and' : 'but';
        $demo .= '<table class="widefat striped"><thead><summary><h4>Available Salesforce API versions. This list is ' . $is_cached . 'cached, ' . $andorbut . ' items ' . $from_cache . ' loaded from the cache. This is not an authenticated request, so it does not touch the Salesforce token.</h4></summary><tr><th>Label</th><th>URL</th><th>Version</th></thead>';
        foreach ( $response as $version ) {
            $class = '';
            if ( $version['version'] === $this->login_credentials['rest_api_version'] ) {
                $class = ' class="current"';
            }
            $demo .= '<tr' . $class . '><td>' . $version['label'] . '</td><td>' . $version['url'] . '</td><td>' . $version['version'] . '</td></tr>';
        }
        $demo .= '</table>';

        $result = $sfapi->query('SELECT Name, Id from Contact LIMIT 100');
        $response = $result['data'];

        // format this array into html so users can see the contacts
        $is_cached = $result['cached'] === true ? '' : 'not ';
        $from_cache = $result['from_cache'] === true ? 'were' : 'were not';
        $andorbut = $result['from_cache'] === true ? 'and' : 'but';
        $is_redo = $result['is_redo'] === true ? '' : 'not ';

        $demo .= '<table class="widefat striped"><thead><summary><h4>Salesforce successfully returned ' . $response['totalSize'] . ' ' . $response['records'][0]['attributes']['type'] . ' records. They are ' . $is_cached . 'cached, ' . $andorbut . ' they ' . $from_cache . ' loaded from the cache. This request did ' . $is_redo . 'require refreshing the Salesforce token.</h4></summary><tr><th>Contact ID</th><th>Name</th></thead>';

        foreach ( $response['records'] as $record ) {
            $demo .= '<tr><td>' . $record['Id'] . '</td><td>' . $record['Name'] . '</td></tr>';
        }
        $demo .= '</table>';
        return $demo;
    }
    
    /**
    * Deauthorize WordPress from Salesforce.
    * This deletes the tokens from the database; it does not currently do anything in Salesforce
    * todo: maybe delete the authorized stuff inside Salesforce? or maybe on an uninstall method?
    */ 
    private function logout() {
        $this->access_token = delete_option( 'salesforce_api_access_token' );
        $this->instance_url = delete_option( 'salesforce_api_instance_url' );
        $this->refresh_token = delete_option( 'salesforce_api_refresh_token' );
        return 'You have been logged out. You can use use the connect button to log in again.';
    }

    /**
    * Render tabs for settings pages in admin
    * @param array $tabs
    * @param string $tab
    */ 
    private function tabs( $tabs, $tab = '' ) {
        $current_tab = $tab;
        screen_icon();
        echo '<h2 class="nav-tab-wrapper">';
        foreach ( $tabs as $tab_key => $tab_caption ) {
            $active = $current_tab == $tab_key ? 'nav-tab-active' : '';
            echo '<a class="nav-tab ' . $active . '" href="?page=salesforce-api-admin&tab=' . $tab_key . '">' . $tab_caption . '</a>';
        }
        echo '</h2>';

        if ( isset( $_GET['tab'] ) ) {
            $tab = urlencode( $_GET['tab'] );   
        } else {
            $tab = '';
        }
    }

    /**
    * Clear schedule
    * This clears the schedule if the user clicks the button
    */ 
    private function clear_schedule( $schedule_name = '' ) {
        if ( $schedule_name !== '' ) {
            $schedule = $this->schedule( $schedule_name );
            $schedule->cancel_by_name( $schedule_name );
            return 'You have cleared the ' . $schedule_name . ' schedule.';
        } else {
            return 'You need to specify the name of the schedule you want to clear.';
        }
    }

    private function get_schedule_count( $schedule_name = '' ) {
        if ( $schedule_name !== '' ) {
            $schedule = $this->schedule( $schedule_name );
            return $this->schedule->count_queue_items( $schedule_name );
        } else {
            return 'unknown';
        }
    }

    /**
    * Load the schedule class
    */ 
    private function schedule( $schedule_name ) {
        if ( ! class_exists( 'Wordpress_Salesforce_Schedule' ) && file_exists( plugin_dir_path( __FILE__ ) . '../vendor/autoload.php' ) ) {
            require_once plugin_dir_path( __FILE__ ) . '../vendor/autoload.php';
            require_once plugin_dir_path( __FILE__ ) . '../classes/schedule.php';
        }
        $schedule = new Wordpress_Salesforce_Schedule( $this->wpdb, $this->version, $this->login_credentials, $this->text_domain, $this->wordpress, $this->salesforce, $this->mappings, $schedule_name, $this->logging, $this->schedulable_classes );
        $this->schedule = $schedule;
        return $schedule;
    }

}