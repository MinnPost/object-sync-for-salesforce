<?php
/**
 * The screen to show the current status of the plugin's connection to Salesforce
 *
 * @package Object_Sync_Salesforce
 */

?>

<h3><?php echo esc_html__( 'Salesforce API Connection Status', 'object-sync-for-salesforce' ); ?></h3>

<p>
	<?php
	echo sprintf(
		// translators: placeholder is for the version number of the Salesforce REST API.
		esc_html__( 'Object Sync for Salesforce is making calls to the Salesforce REST API using version %1$s. ', 'object-sync-for-salesforce' ),
		esc_html( $this->login_credentials['rest_api_version'] )
	);
	?>
	<?php if ( false === $this->login_credentials['using_deprecated_option'] && false === $this->login_credentials['using_developer_filter'] ) : ?>
		<?php
			echo esc_html__( 'This plugin works to keep up to date with the release cycle of API versions from Salesforce. When a new version is released, the plugin will upgrade to that version as soon as possible. If you upgrade the plugin when new releases come out, you will always be on the highest supported version of the Salesforce REST API. Object Sync for Salesforce will not include plugin functionality that depends on a version it does not support, and will ensure that all releases follow this pattern.', 'object-sync-for-salesforce' );
		?>
	<?php elseif ( true === $this->login_credentials['using_deprecated_option'] ) : ?>
		<?php echo esc_html__( 'This API version is set from a previous version of the plugin, and the plugin functionality of choosing the API version in the interface has been deprecated. In a future release (likely version 3.0.0), the ability to use the REST API version set by the interface will be removed.', 'object-sync-for-salesforce' ); ?>
	<?php else : ?>
		<?php echo esc_html__( 'This API version is set with the use of a developer hook.', 'object-sync-for-salesforce' ); ?>
	<?php endif; ?>
</p>

<h3><?php echo esc_html__( 'Test Salesforce API Call', 'object-sync-for-salesforce' ); ?></h3>
<?php if ( '' !== $contacts_apicall_summary ) : ?>
	<table class="widefat striped">
		<thead>
			<summary>
				<h4><?php echo $contacts_apicall_summary; ?></h4>
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
