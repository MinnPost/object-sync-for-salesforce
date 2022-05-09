<?php
/**
 * The screen to show the current status of the plugin's connection to Salesforce
 *
 * @package Object_Sync_Salesforce
 */

?>

<h3><?php echo esc_html__( 'Salesforce Status', 'object-sync-for-salesforce' ); ?></h3>
<p>
<?php
	echo sprintf(
		// translators: placeholder is for the version number of the Salesforce REST API.
		esc_html__( 'The plugin is using version %1$s of the Salesforce REST API. If the plugin settings are not overriding the default value, the plugin changes to support new API versions regularly.', 'object-sync-for-salesforce' ),
		esc_html( $this->login_credentials['rest_api_version'] )
	);
	?>
</p>

<h3><?php echo esc_html__( 'Test Salesforce API Call', 'object-sync-for-salesforce' ); ?></h3>
<?php if ( '' !== $contacts_apicall_summary ) : ?>
	<table class="widefat striped">
		<thead>
			<summary>
				<h4><?php echo $contacts_apicall_summary; ?></h4>
			</summary>
			<tr>
				<th><?php echo esc_html__( 'Contact ID' ); ?></th>
				<th><?php echo esc_html__( 'Name' ); ?></th>
			</tr>
		</thead>
		<tbody>
			<?php foreach ( $contacts['data']['records'] as $contact ) { ?>
				<tr>
					<td><?php echo esc_html( $contact['Id'] ); ?></td>
					<td><?php echo esc_html( $contact['Name'] ); ?></td>
				</tr>
			<?php } ?>
		</tbody>
	</table>
<?php endif; ?>

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
