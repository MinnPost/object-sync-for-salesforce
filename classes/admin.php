<?php

class Wordpress_Salesforce_Admin {

    protected $wpdb;
    protected $version;
    protected $login_credentials;
    protected $text_domain;
    protected $mappings;
    protected $salesforce;

    /**
    * Create default WordPress admin functionality for Salesforce
    *
    * @param array $loggedin
    * @param array $text_domain
    * @throws \Exception
    */
    public function __construct( $wpdb, $version, $login_credentials, $text_domain, $salesforce, $mappings ) {
        $this->wpdb = &$wpdb;
        $this->version = $version;
        $this->login_credentials = $login_credentials;
        $this->text_domain = $text_domain;
        $this->salesforce = $salesforce;
        $this->mappings = $mappings;
        add_action('admin_init', array( &$this, 'salesforce_settings_forms' ) );
        add_action( 'admin_post_post_fieldmap', array( &$this, 'prepare_fieldmap_data' ) );
        add_action( 'admin_notices', array( &$this, 'fieldmap_error_notice' ) );
        add_action( 'admin_post_delete_fieldmap', array( &$this, 'delete_fieldmap' ) );
    }
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
    */ 
    public function show_admin_page() {
        echo '<h1>' . get_admin_page_title() . '</h1>';
        $tabs = array(
            'settings' => 'Settings',
            'authorize' => 'Authorize',
            'objects' => 'Object setup',
            'fieldmaps' => 'Fieldmaps'
        ); // this creates the tabs for the admin
        $tab = isset( $_GET['tab'] ) ? $_GET['tab'] : 'settings';
        echo '<div class="wrap">';
        $this->tabs( $tabs, $tab );

        if ( ! current_user_can('manage_options') ){
            //salesforce_api_admin_render_header( __("You don't have permission to manage Salesforce API settings",'salesforce-api'),'error');
            //salesforce_api_admin_render_footer();
            return;
        }

        $consumer_key = $this->login_credentials['consumer_key'];
        $consumer_secret = $this->login_credentials['consumer_secret'];
        $callback_url = $this->login_credentials['callback_url'];
        $text_domain = $this->text_domain;

        try {
            switch( $tab ) {
                case 'authorize':
                    if ( isset( $_GET['code'] ) )  {
                        $is_authorized = $this->salesforce['sfapi']->request_token( esc_attr( $_GET['code'] ) );
                        echo "<script>window.location = '$callback_url';</script>";
                    } else if ( $this->salesforce['is_authorized'] === true ) {
                        echo '<div class="success"><h2>Salesforce is successfully authenticated.</h2></div>';
                        echo '<p><a class="button-primary" href="' . $callback_url . '&amp;tab=logout">Disconnect from Salesforce</a></p>';
                        $demo = $this->demo( $this->salesforce['sfapi'] );
                        echo $demo;
                    } else if ( isset( $consumer_key ) && isset( $consumer_secret ) ) {
                        echo '<p><a class="button-primary" href="' . $this->salesforce['sfapi']->get_authorization_code() . '">' . esc_html__( 'Connect to Salesforce', $this->text_domain ) . '</a></p>';
                    } // need to throw an error here if all the stuff is missing
                    break;
                case 'fieldmaps':
                    if ( isset( $_GET['method'] ) ) {
                        echo '<form method="post" action="options.php">';
                            echo settings_fields( $tab ) . do_settings_sections( $tab );
                            submit_button( 'Save settings' );
                        echo '</form>';
                    } else {
                        $fieldmaps = $this->list_fieldmaps( $this->salesforce['sfapi'] );
                        echo $fieldmaps;
                    }
                    break;
                case 'logout':
                    $message = $this->logout();
                    echo '<p>' . $message . '</p>';
                    break;
                default:
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
        $this->fields_settings( 'settings', 'settings', $input_callback_default );
        $this->fields_objects( 'objects', 'objects', $input_checkboxes_default );
        $this->fields_fieldmaps( 'fieldmaps', 'objects' );
    }

    /**
    * Fields for the Settings tab
    * This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
    *
    * @param string $page
    * @param string $section
    * @param string $input_callback
    */
    private function fields_settings( $page, $section, $input_callback ) {
        add_settings_section( $page, ucwords( $page ), null, $page );
        $salesforce_settings = array(
            'consumer_key' => array(
                'title' => 'Consumer Key',
                'callback' => $input_callback,
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
                'callback' => $input_callback,
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
                'callback' => $input_callback,
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
                'callback' => $input_callback,
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
                'callback' => $input_callback,
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'type' => 'text',
                    'desc' => '',
                    'constant' => 'SALESFORCE_API_VERSION'
                ),
            ),
        );
        foreach( $salesforce_settings as $key => $attributes ) {
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
            register_setting( $section, $id );
        }
    }

    /**
    * Fields for the Object setup tab
    * This runs add_settings_section once, as well as add_settings_field and register_setting methods for each option
    *
    * @param string $page
    * @param string $section
    * @param string $input_callback
    */
    private function fields_objects( $page, $section, $input_callback ) {
        add_settings_section( $page, ucwords( $page ), null, $page );
        $items = array();
        $sfapi = $this->salesforce['sfapi'];
        $objects = $sfapi->objects();
        
        foreach ( $objects as $object ) {
            $items[] = array(
                'text' => $object['name'] . ' (' . $object['label'] . ')',
                'id' => strtolower( $object['name'] ),
                'name' => strtolower( $object['name'] ),
                'desc' => ''
            );
        }

        $salesforce_settings = array(
            'enabled_objects' => array(
                'title' => 'Salesforce Objects',
                'callback' => $input_callback,
                'page' => $page,
                'section' => $section,
                'args' => array(
                    'items' => $items,
                ),
                
            ),
        );
        foreach( $salesforce_settings as $key => $attributes ) {
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
            register_setting( $section, $id );
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
    * Default display for <input> fields
    *
    * @param array $args
    */
    public function display_input_field( $args ) {
        $type   = $args['type'];
        $id     = $args['label_for'];
        $name   = $args['name'];
        $desc   = $args['desc'];
        if ( !defined( $args['constant'] ) ) {
            $value  = esc_attr( get_option( $id, '' ) );
            echo '<input type="' . $type. '" value="' . $value . '" name="' . $name . '" id="' . $id . '"
            class="regular-text code" />';
            if ( $desc != '' ) {
                echo '<p class="description">' . $desc . '</p>';
            }
        } else {
            echo '<p><code>Defined in wp-config.php</code></p>';
        }
    }

    /**
    * Display for multiple checkboxes
    * Maybe should expand this to also accept just one checkbox, but maybe above method will already do that
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
            echo '<div><label><input type="' . $type. '" value="' . $key . '" name="' . $name . '[]" id="' . $id . '" ' . $checked . ' />' . $text . '</label></div>';
            if ( $desc != '' ) {
                echo '<p class="description">' . $desc . '</p>';
            }
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
        $demo .= '<table class="widefat striped"><thead><summary><h4>Available Salesforce API versions. This list is ' . $is_cached . 'cached, and items ' . $from_cache . ' loaded from the cache. This is not an authenticated request, so it does not touch the Salesforce token.</h4></summary><tr><th>Label</th><th>URL</th><th>Version</th></thead>';
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
        $is_redo = $result['is_redo'] === true ? '' : 'not ';

        $demo .= '<table class="widefat striped"><thead><summary><h4>Salesforce successfully returned ' . $response['totalSize'] . ' ' . $response['records'][0]['attributes']['type'] . ' records. They are ' . $is_cached . 'cached, and they ' . $from_cache . ' loaded from the cache. This request did ' . $is_redo . 'require refreshing the Salesforce token.</h4></summary><tr><th>Contact ID</th><th>Name</th></thead>';

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

}