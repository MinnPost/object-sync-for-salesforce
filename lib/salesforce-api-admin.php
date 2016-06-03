<?php
/**
 * Required Salesforce API admin functions.
 * Configures and authenticates with the Salesforce API.
 * @author Jonathan Stegall <@jonathanstegall>
 */
 
 

/**
 * Open admin page with header and message
 */

/*function salesforce_api_admin_render_header( $subheader, $css = '' ){
    ?>
     <div class="wrap">
        <h2><?php echo esc_html__('Salesforce API Authentication Settings','salesforce-api')?></h2>
        <div class="<?php echo $css?>">
            <h3><?php echo esc_html($subheader)?></h3>
        </div>
    <?php
}*/



/**
 * Close admin page
 */
/*function salesforce_api_admin_render_footer(){
    ?>
    </div>
    <?php
}*/

function register_salesforce_settings() {
    $salesforce_api_settings = _salesforce_api_config();
}



/**
 * Render form for viewing/editing of application settings
 */
function salesforce_api_admin_api_settings_form(){
    extract( _salesforce_api_config() );
    ?>
    <form action="<?php echo salesforce_api_admin_base_uri()?>" method="post">
        <div>
            <label for="salesforce-api--consumer-key"><?php echo __('Consumer Key','salesforce-api');?>:</label>
            <?php if ( !defined( 'SALESFORCE_CONSUMER_KEY' ) ) { ?>
                <input type="text" name="saf_salesforce[consumer_key]" id="salesforce-api--consumer-key" value="<?php echo esc_html($consumer_key)?>" />
            <?php } else { ?>
                <p><code>Defined in wp-config.php</code></p>
            <?php } ?>
        </div>
        <div>
            <label for="salesforce-api--consumer-secret"><?php echo __('Consumer Secret','salesforce-api');?>:</label>
            <?php if ( !defined( 'SALESFORCE_CONSUMER_SECRET' ) ) { ?>
                <input type="text" name="saf_salesforce[consumer_secret]" id="salesforce-api--consumer-secret" value="<?php echo esc_html($consumer_secret)?>" />
            <?php } else { ?>
                <p><code>Defined in wp-config.php</code></p>
            <?php } ?>
        </div>
        <div>
            <label for="salesforce-api--callback-url"><?php echo __('Callback URL','salesforce-api');?>:</label>
            <?php if ( !defined( 'SALESFORCE_CALLBACK_URL' ) ) { ?>
                <input type="text" name="saf_salesforce[callback_url]" id="salesforce-api--callback-url" value="<?php echo esc_html($callback_url)?>" />
            <?php } else { ?>
                <p><code>Defined in wp-config.php</code></p>
            <?php } ?>
        </div>
        <div>
            <label for="salesforce-api--login-base-url"><?php echo __('Login Base URL','salesforce-api');?>:</label>
            <?php if ( !defined( 'SALESFORCE_LOGIN_BASE_URL' ) ) { ?>
                <input type="text" size="64" name="saf_salesforce[login_base_url]" id="salesforce-api--login-base-url" value="<?php echo esc_html($login_base_url)?>" />
            <?php } else { ?>
                <p><code>Defined in wp-config.php</code></p>
            <?php } ?>
        </div>
        <div>
            <label for="salesforce-api--api-version"><?php echo __('API Version','salesforce-api');?>:</label>
            <?php if ( !defined( 'SALESFORCE_API_VERSION' ) ) { ?>
                <input type="text" name="saf_salesforce[api_version]" id="salesforce-api--api-version" value="<?php echo esc_html($api_version)?>" />
            <?php } else { ?>
                <p><code>Defined in wp-config.php</code></p>
            <?php } ?>
        </div>
        <p class="submit">
            <input type="submit" class="button-primary" value="<?php echo esc_html__('Save settings','salesforce-api')?>" />
        </p>
        <small>
            <?php echo esc_html__('These details are available in','salesforce-api')?> 
        </small>
    </form>
    <?php
}



/**
 * Render "Connect" button for authenticating at test.salesforce.com or login.salesforce.com
 * @param string OAuth application Consumer Key
 * @param string OAuth application Consumer Secret
 */
function salesforce_api_admin_render_login( $consumer_key, $consumer_secret, $callback_url, $login_base_url ){
    try {
        $callback = salesforce_api_admin_base_uri();
        //$token = salesforce_api_oauth_request_token( $consumer_key, $consumer_secret, $callback_url );
    }
    catch( Exception $Ex ){
        echo '<div class="error"><p><strong>Error:</strong> ',esc_html( $Ex->getMessage() ),'</p></div>';
        return;
    }

    // todo: store this url in a better way somehow?
    $href = $login_base_url .'/services/oauth2/authorize?response_type=code' . '&client_id=' . $consumer_key . '&redirect_uri=' . urlencode( $callback_url );


    echo '<p><a class="button-primary" href="',esc_html($href),'">'.esc_html__('Connect to Salesforce','salesforce-api').'</a></p>';
    echo '<p>&nbsp;</p>';
}

 
 
 
/**
 * Render full admin page
 */ 
/*
function salesforce_api_admin_render_page() {
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
    salesforce_api_admin_render_footer();
}
*/


/**
 * Calculate base URL for admin OAuth callbacks
 * @return string
 */
function salesforce_api_admin_base_uri(){
    static $base_uri;
    if( ! isset($base_uri) ){
        $port = isset($_SERVER['HTTP_X_FORWARDED_PORT']) ? $_SERVER['HTTP_X_FORWARDED_PORT'] : $_SERVER['SERVER_PORT'];
        $prot = '443' === $port ? 'https:' : 'http:';
        $base_uri = $prot.'//'.$_SERVER['HTTP_HOST'].''.current( explode( '&', $_SERVER['REQUEST_URI'], 2 ) );
    }
    return $base_uri;
}




/**
 * Admin menu registration callback
 */
/*function salesforce_api_admin_menu() {
    $title = __('Salesforce API','salesforce-api');
    add_options_page( $title, $title, 'manage_options', 'salesforce-api-admin', 'salesforce_api_admin_render_page');
}*/



// register our admin page with the menu, and we're done.
//add_action('admin_menu', 'salesforce_api_admin_menu');



add_action('admin_init', 'register_salesforce_settings');