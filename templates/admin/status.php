<?php
/**
 * The screen to show the current status of the plugin's connection to Salesforce
 *
 * @package Object_Sync_Salesforce
 */

?>

<h3><?php echo esc_html__( 'Salesforce API Connection Status', 'object-sync-for-salesforce' ); ?></h3>

<p>
	<?php if ( false === $this->login_credentials['using_deprecated_option'] && false === $this->login_credentials['using_developer_filter'] ) : ?>
		<?php
			echo sprintf(
				// translators: 1) is the version number of the Salesforce REST API.
				esc_html__( 'Object Sync for Salesforce is using version %1$s of the Salesforce REST API. This plugin works to keep up to date with the release cycle of API versions from Salesforce. When a new version is released, the plugin will upgrade to that version as soon as possible. If you upgrade the plugin when new releases come out, you will always be on the highest supported version of the Salesforce REST API. Object Sync for Salesforce will not include plugin functionality that depends on a version it does not support.', 'object-sync-for-salesforce' ),
				esc_attr( $this->login_credentials['rest_api_version'] )
			);
		?>
	<?php elseif ( true === $this->login_credentials['using_deprecated_option'] ) : ?>
		<?php echo wp_kses_post( $this->notices_data['deprecated_api_version']['message'] ); ?>
	<?php else : ?>
		<?php
			echo sprintf(
				// translators: 1) is the version number of the Salesforce REST API.
				esc_html__( 'Object Sync for Salesforce is using version %1$s of the Salesforce REST API, which is configured by developer hook. This value is no longer configurable in the plugin settings, but will continue to support this developer hook. However, use this at your own risk, as it is possible that the Salesforce REST API, or this plugin, will depend on different functionality than other versions.', 'object-sync-for-salesforce' ),
				esc_attr( $this->login_credentials['rest_api_version'] )
			);
		?>
	<?php endif; ?>
</p>

<h3><?php echo esc_html__( 'Test Salesforce API Call', 'object-sync-for-salesforce' ); ?></h3>
<?php if ( '' !== $contacts_apicall_summary ) : ?>
	<table class="widefat striped">
		<thead>
			<summary>
				<p><?php echo wp_kses_post( $contacts_apicall_summary ); ?></p>
			</summary>
			<tr>
				<th><?php echo esc_html__( 'Contact ID', 'object-sync-for-salesforce' ); ?></th>
				<th><?php echo esc_html__( 'Name', 'object-sync-for-salesforce' ); ?></th>
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
