<h3><?php echo esc_html__( 'Salesforce Status', 'object-sync-for-salesforce' ); ?></h3>
<p>
<?php
	// translators: placeholder is for the version number of the Salesforce REST API
	echo sprintf( esc_html__( 'Currently, we are using version %1$s of the Salesforce REST API. Available versions are displayed below.', 'object-sync-for-salesforce' ),
		esc_html( $this->login_credentials['rest_api_version'] )
	);
?>
</p>
<table class="widefat striped">
	<thead>
		<summary>
			<h4>Available Salesforce API versions. This list is <?php echo esc_html( $versions_is_cached ); ?> cached, <?php echo esc_html( $versions_andorbut ); ?> items <?php echo esc_html( $versions_from_cache ); ?> loaded from the cache. This is not an authenticated request, so it does not touch the Salesforce token.</h4>
		</summary>
		<tr>
			<th><?php echo esc_html__( 'Label', 'object-sync-for-salesforce' ); ?></th>
			<th><?php echo esc_html__( 'URL', 'object-sync-for-salesforce' ); ?></th>
			<th><?php echo esc_html__( 'Version', 'object-sync-for-salesforce' ); ?></th>
		</tr>
	</thead>
	<tbody>
		<?php foreach ( $versions['data'] as $version ) { ?>
			<?php
			$class = '';
			if ( $version['version'] === $this->login_credentials['rest_api_version'] ) {
				$class = ' class="current"';
			}
			?>
			<tr<?php echo esc_attr( $class ); ?>>
				<td><?php echo esc_html( $version['label'] ); ?></td>
				<td><?php echo esc_html( $version['url'] ); ?></td>
				<td><?php echo esc_html( $version['version'] ); ?></td>
			</tr>
		<?php } ?>
	</tbody>
</table>

<table class="widefat striped">
	<thead>
		<summary>
			<h4>Salesforce successfully returned <?php echo absint( $contacts['data']['totalSize'] ); ?> <?php echo esc_html( $contacts['data']['records'][0]['attributes']['type'] ); ?> records. They are <?php echo esc_html( $contacts_is_cached ); ?>cached, <?php echo esc_html( $contacts_andorbut ); ?> they <?php echo esc_html( $contacts_from_cache ); ?> loaded from the cache. This request did <?php echo esc_html( $contacts_is_redo ); ?>require refreshing the Salesforce token.</h4>
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
