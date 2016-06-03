<?php
/**
 * Salesforce API admin menu functions.
 * If the plugin including the API does not have its own menu functions, this provides an API-only 
 * menu item under the WordPress Settings.
 * It allows users to configure the Salesforce API settings, and authenticate WordPress with Salesforce.
 * Additional settings would have to be on a plugin-specific screen, if this page was included.
 * @author Jonathan Stegall <@jonathanstegall>
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
    if ( $tab !== 'authorize' ) { ?>
        <div class="wrap">
            <?php plugin_options_tabs( $tabs, $tab ); ?>
            <form method="post" action="options.php">
                <?php settings_fields( $tab ); ?>
                <?php do_settings_sections( $tab ); ?>
                <?php submit_button(); ?>      
            </form>
        </div>
    <?php } else { ?>
        <div class="wrap">
        <?php
        plugin_options_tabs( $tabs, $tab );
        $result = salesforce_authenticate();
        echo '<h3 class="' . $result['style'] . '">' . $result['message'] . '</h3>';
        $demo = salesforce_demo();
    }
    ?>
    </div>
    <?php
}

// register our admin page with the menu, and we're done.
add_action('admin_menu', 'salesforce_api_admin_menu');