<?php
/**
 * Show when the plugin has been authenticated with a Salesforce instance.
 *
 * @package Object_Sync_Salesforce
 */

?>
<div class="success"><h2><?php echo esc_html__( 'Salesforce is successfully authenticated.', 'object-sync-for-salesforce' ); ?></h2></div>
<p><a class="button button-primary" href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=logout' ) ); ?>"><?php echo esc_html__( 'Disconnect from Salesforce', 'object-sync-for-salesforce' ); ?></a></p>
