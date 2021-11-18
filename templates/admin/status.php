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
		esc_html__( 'Currently, we are using version %1$s of the Salesforce REST API. Available versions are displayed below.', 'object-sync-for-salesforce' ),
		esc_html( $this->login_credentials['rest_api_version'] )
	);
	?>
</p>
<table class="widefat striped sfwp-salesforce-version-list">
	<thead>
		<summary>
			<h4><?php echo $versions_apicall_summary; ?></h4>
		</summary>
		<tr>
			<th><?php echo esc_html__( 'Version Number', 'object-sync-for-salesforce' ); ?></th>
			<th><?php echo esc_html__( 'URL', 'object-sync-for-salesforce' ); ?></th>
			<th><?php echo esc_html__( 'Label', 'object-sync-for-salesforce' ); ?></th>
		</tr>
	</thead>
	<tbody>
		<?php foreach ( $versions['data'] as $version ) { ?>
			<?php
			$class      = '';
			$is_current = '';
			if ( $version['version'] === $this->login_credentials['rest_api_version'] ) {
				$class      = ' class="current"';
				$is_current = '&nbsp;' . esc_html__( 'This is the currently active version.', 'object-sync-for-salesforce' );
			}
			?>
			<tr<?php echo $class; ?>>
				<td><strong><?php echo esc_html( $version['version'] ); ?></strong><?php echo $is_current; ?></td>
				<td><?php echo esc_html( $version['url'] ); ?></td>
				<td><?php echo esc_html( $version['label'] ); ?></td>
			</tr>
		<?php } ?>
	</tbody>
</table>

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
