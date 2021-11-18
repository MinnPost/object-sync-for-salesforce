<?php
/**
 * The default form for plugin settings screens
 *
 * @package Object_Sync_Salesforce
 */

?>
<form method="post" action="options.php">
	<?php
		settings_fields( $tab ) . do_settings_sections( $tab );
		submit_button( esc_html__( 'Save settings', 'object-sync-for-salesforce' ) );
	?>
</form>

<p><small>
	<?php
	// translators: the placeholders refer to: 1) the cache clear link, 2) the cache clear link text.
	echo sprintf(
		esc_html__( 'Has your WordPress or Salesforce data structure changed? ', 'object-sync-for-salesforce' ) . '<a href="%1$s" id="clear-sfwp-cache">%2$s</a>' . esc_html__( ' to make sure you can map the most recent data structures.', 'object-sync-for-salesforce' ),
		esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=clear_cache' ) ),
		esc_html__( 'Clear the plugin cache', 'object-sync-for-salesforce' )
	);
	?>
</small></p>
