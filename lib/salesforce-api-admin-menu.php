<?php
/**
 * Salesforce API admin menu functions.
 * If the plugin including the API does not have its own menu functions, this provides an API-only 
 * menu item under the WordPress Settings.
 * It allows users to configure the Salesforce API settings, and authenticate WordPress with Salesforce.
 * Additional settings would have to be on a plugin-specific screen, if this page was included.
 * @author Jonathan Stegall <@jonathanstegall>
 */
 
 

/**
 * Open admin page with header and message
 */
function salesforce_api_admin_render_header( $subheader, $css = '' ){
    ?>
        <div class="<?php echo $css?>">
            <h3><?php echo esc_html($subheader)?></h3>
        </div>
    <?php
}



/**
 * Admin setting tabs
 */
function salesforce_api_option_tabs( $tabs, $default_tab = '' ){
    $current_tab = isset( $_GET['tab'] ) ? $_GET['tab'] : $default_tab; // make that configurable somewhere

    screen_icon();
    echo '<h2 class="nav-tab-wrapper">';
    foreach ( $tabs as $tab_key => $tab_caption ) {
        $active = $current_tab == $tab_key ? 'nav-tab-active' : '';
        echo '<a class="nav-tab ' . $active . '" href="?page=' . $this->plugin_name . '&tab=' . $tab_key . '">' . $tab_caption . '</a>';
    }
    echo '</h2>';
}

 
 
 /**
 * Close admin page
 */
function salesforce_api_admin_render_footer(){
    ?>
    <?php
}

 
 
 
/**
 * Render full admin page
 */ 
function salesforce_api_admin_render_page() { ?>
    <div class="wrap">
    <?php
    //salesforce_api_option_tabs();
    if ( ! current_user_can('manage_options') ){
        salesforce_api_admin_render_header( __("You don't have permission to manage Salesforce API settings",'salesforce-api'),'error');
        salesforce_api_admin_render_footer();
        return;
    }
    try {

        // update applicaion settings if posted
        if( isset($_POST['saf_salesforce']) && is_array( $update = $_POST['saf_salesforce'] ) ){
            $conf = _salesforce_api_config( $update );
        }

        // else get current settings
        else {
            $conf = _salesforce_api_config();
        }

        // check whether we have any OAuth params
        extract( $conf );
        if( ! $consumer_key || ! $consumer_secret || ! $callback_url || ! $login_base_url){
            throw new Exception( __('Salesforce application not fully configured','salesforce-api') );
        }

        // else exchange access token if callback // request secret saved as option

        if( isset( $_GET['code'] ) )  {
            $token = salesforce_api_oauth_access_token( $consumer_key, $consumer_secret, $callback_url, $login_base_url, $_GET['code'] );
            // have access token, update config
            $conf = _salesforce_api_config( array(
                'access_token'   => $token->access_token,
                'instance_url'   => $token->instance_url,
                'refresh_token'  => $token->refresh_token,

            ) );
            extract( $conf );
            // fall through to verification of credentials
        }

        // else administrator needs to connect / authenticate with Salesforce.
        if( ! $access_token || ! $instance_url ){
            salesforce_api_admin_render_header( __('Plugin not yet authenticated with Salesforce','salesforce-api'), 'error' );
            salesforce_api_admin_render_login( $consumer_key, $consumer_secret, $callback_url, $login_base_url );
        }

        // else we have auth - verify that tokens are all still valid
        else if ( salesforce_api_configured() === true) {
            salesforce_api_admin_render_header( __('Salesforce is authorized','salesforce-api'), 'success' );
        }

    }
    catch( SalesforceApiException $Ex ){
        salesforce_api_admin_render_header( $Ex->getStatus().': Error '.$Ex->getCode().', '.$Ex->getMessage(), 'error' );
        if( 401 === $Ex->getStatus() ){
            salesforce_api_admin_render_login( $consumer_key, $consumer_secret, $callback_url, $login_base_url );
        }
    }
    catch( Exception $Ex ){
        salesforce_api_admin_render_header( $Ex->getMessage(), 'error' );
    }
    
    // end admin page with options form and close wrapper
    salesforce_api_admin_api_settings_form();
    salesforce_api_admin_render_footer(); ?>
    </div>
    <?php
}


/*function register_salesforce_settings() {
        $tabs['settings'] = 'Settings';
        //register_setting( 'settings', 'settings' );
        add_settings_section(
            'section_settings', 'Settings',
            array( &$this, 'section_settings_desc' ),
            'settings'
        );
        add_settings_field(
            'salesforce_consumer_key', 'Consumer Key',
            array( &$this, 'field_salesforce_consumer_key' ),
            $this->settings_key,
            'section_settings'
        );
        add_settings_field(
            'salesforce_consumer_secret', 'Consumer Secret',
            array( &$this, 'field_salesforce_consumer_secret' ),
            $this->settings_key,
            'section_settings'
        );
        add_settings_field(
            'salesforce_callback_url', 'Callback URL',
            array( &$this, 'field_salesforce_callback_url' ),
            $this->settings_key,
            'section_settings'
        );
        add_settings_field(
            'salesforce_base_url', 'Login Base URL',
            array( &$this, 'field_salesforce_base_url' ),
            $this->settings_key,
            'section_settings'
        );
        add_settings_field(
            'salesforce_data_endpoint', 'Data Query URL Endpoint',
            array( &$this, 'field_salesforce_data_endpoint' ),
            $this->settings_key,
            'section_settings'
        );
    }
*/

function plugin_options_tabs( $tabs, $tab = '' ) {
    $current_tab = $tab;
    screen_icon();
    echo '<h2 class="nav-tab-wrapper">';
    foreach ( $tabs as $tab_key => $tab_caption ) {
        $active = $current_tab == $tab_key ? 'nav-tab-active' : '';
        echo '<a class="nav-tab ' . $active . '" href="?page=salesforce-api-admin&tab=' . $tab_key . '">' . $tab_caption . '</a>';
    }
    echo '</h2>';
}



/**
 * Admin menu registration callback
 */
function salesforce_api_admin_menu() {
    $title = __('Salesforce API','salesforce-api');
    add_options_page( $title, $title, 'manage_options', 'salesforce-api-admin', 'salesforce_api_admin_theme_settings_page');
}

function salesforce_api_admin_theme_settings_page() {
    $tabs = array('settings' => 'Settings', 'authorize' => 'Authorize');
    $tab = isset( $_GET['tab'] ) ? $_GET['tab'] : 'settings';
    ?>
    <div class="wrap">
        <?php plugin_options_tabs( $tabs, $tab ); ?>
        <form method="post" action="options.php">
            <?php settings_fields( $tab ); ?>
            <?php do_settings_sections( $tab ); ?>
            <?php submit_button(); ?>      
        </form>
    </div>
    <?php
}



// register our admin page with the menu, and we're done.
add_action('admin_menu', 'salesforce_api_admin_menu');



