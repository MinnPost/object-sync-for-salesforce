<?php
/**
 * Salesforce API admin functions.
 * Configures and authenticates with the Salesforce API.
 * @author Jonathan Stegall <@jonathanstegall>
 */
 
 

/**
 * Open admin page with header and message
 */
function salesforce_api_admin_render_header( $subheader, $css = '' ){
    ?>
     <div class="wrap">
        <h2><?php echo esc_html__('Salesforce API Authentication Settings','salesforce-api')?></h2>
        <div class="<?php echo $css?>">
            <h3><?php echo esc_html($subheader)?></h3>
        </div>
    <?php
} 



/**
 * Close admin page
 */
function salesforce_api_admin_render_footer(){
    ?>
    </div>
    <?php
}



/**
 * Render form for viewing/editing of application settings
 */
function salesforce_api_admin_render_form(){
    extract( _salesforce_api_config() );
    ?>
    <form action="<?php echo salesforce_api_admin_base_uri()?>" method="post">
        <p>
            <label for="salesforce-api--consumer-key"><?php echo __('Consumer Key','salesforce-api');?>:</label><br />
            <input type="text" size="64" name="saf_salesforce[consumer_key]" id="salesforce-api--consumer-key" value="<?php echo esc_html($consumer_key)?>" />
        </p>
        <p>
            <label for="salesforce-api--consumer-secret"><?php echo __('Consumer Secret','salesforce-api');?>:</label><br />
            <input type="text" size="64" name="saf_salesforce[consumer_secret]" id="salesforce-api--consumer-secret" value="<?php echo esc_html($consumer_secret)?>" />
        </p>
        <p>
            <label for="salesforce-api--callback-url"><?php echo __('Callback URL','salesforce-api');?>:</label><br />
            <input type="text" size="64" name="saf_salesforce[callback_url]" id="salesforce-api--callback-url" value="<?php echo esc_html($callback_url)?>" />
        </p>
        <p>
            <label for="salesforce-api--login-base-url"><?php echo __('Login Base URL','salesforce-api');?>:</label><br />
            <input type="text" size="64" name="saf_salesforce[login_base_url]" id="salesforce-api--login-base-url" value="<?php echo esc_html($login_base_url)?>" />
        </p>
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
        $Token = salesforce_api_oauth_request_token( $consumer_key, $consumer_secret, $callback_url );
    }
    catch( Exception $Ex ){
        echo '<div class="error"><p><strong>Error:</strong> ',esc_html( $Ex->getMessage() ),'</p></div>';
        return;
    }
    // Remember request token and render link to authorize
    // we're storing permanently - not using session here, because WP provides no session API.
    _salesforce_api_config( array( 'access_token' => $Token['access_token'], 'instance_url' => $Token['instance_url'], 'refresh_token' => $Token['refresh_token'] ) );
    echo '<p><a class="button-primary" href="',esc_html($href),'">'.esc_html__('Connect to Salesforce','salesforce-api').'</a></p>';
    echo '<p>&nbsp;</p>';
}
 
 
 
 
/**
 * Render full admin page
 */ 
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
            throw new Exception( __('All config items still missing','salesforce-api') );
        }

        // else exchange access token if callback // request secret saved as option

        if( isset( $_GET['code'] ) )  {
            $Token = salesforce_api_oauth_access_token( $consumer_key, $consumer_secret, $callback_url, $login_base_url, $_GET['code'] );
            // have access token, update config
            $conf = _salesforce_api_config( array(
                'access_token'     => $Token['access_token'],
                'instance_url'  => $Token['instance_url'],
                'refresh_token'  => $Token['refresh_token'],

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
        else {
            $me = salesforce_api_get('account/verify_credentials');
            salesforce_api_admin_render_header( sprintf( __('Authenticated as @%s','salesforce-api'), $me['screen_name'] ), 'updated' );
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
    salesforce_api_admin_render_form();
    salesforce_api_admin_render_footer();
}




/**
 * Admin menu registration callback
 */
function salesforce_api_admin_menu() {
    $title = __('Salesforce API','salesforce-api');
    add_options_page( $title, $title, 'manage_options', 'salesforce-api-admin', 'salesforce_api_admin_render_page');
}



// register our admin page with the menu, and we're done.
add_action('admin_menu', 'salesforce_api_admin_menu');



