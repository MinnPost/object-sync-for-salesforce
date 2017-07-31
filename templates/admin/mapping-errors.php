<h2><?php echo esc_html__( 'Mapping Errors', 'object-sync-for-salesforce' ); ?></h2>
<p><?php echo esc_html__( 'When this tab is present, it means one or more mapping errors have occurred when the plugin has tried to save a new mapping object, either based on data pulled in from Salesforce or data that was sent to Salesforce. The plugin creates a temporary flag for WordPress (if it is a pull action) or for Salesforce (if it is a push action), and if it fails the temporary flag remains.', 'object-sync-for-salesforce' ); ?></p>
<p><?php echo esc_html__( 'For any mapping object error, you can edit (if, for example, you know the ID of the item that should be in place) or delete each database row, or you can try to track down what the plugin was doing based on the other data displayed here.', 'object-sync-for-salesforce' ); ?></p>
<p><?php echo esc_html__( 'If you edit one of these items, and it correctly maps data between the two systems, the sync for those items will behave as normal going forward, so any edits you do after that will sync as they should.', 'object-sync-for-salesforce' ); ?></p>

<table class="widefat striped">
	<thead>
		<tr>
			<th><?php echo esc_html__( 'Type', 'object-sync-for-salesforce' ); ?></th>
			<th><?php echo esc_html__( 'WordPress ID', 'object-sync-for-salesforce' ); ?></th>
			<th><?php echo esc_html__( 'WordPress Object Type', 'object-sync-for-salesforce' ); ?></th>
			<th><?php echo esc_html__( 'Salesforce ID', 'object-sync-for-salesforce' ); ?></th>
			<th><?php echo esc_html__( 'Created Date/Time', 'object-sync-for-salesforce' ); ?></th>
			<th colspan="2"><?php echo esc_html__( 'Actions', 'object-sync-for-salesforce' ); ?></th>
		</tr>
	</thead>
	<tbody>
		<?php if ( ! empty( $mapping_errors['pull_errors'] ) ) : ?>
			<?php foreach ( $mapping_errors['pull_errors'] as $error ) { ?>
		<tr>
			<td><?php echo esc_html__( 'Pull from Salesforce', 'object-sync-for-salesforce' ); ?></td>
			<td><?php echo $error['wordpress_id']; ?></td>
			<td><?php echo $error['wordpress_object']; ?></td>
			<td><?php echo $error['salesforce_id']; ?></td>
			<td><?php echo date_i18n( 'Y-m-d g:i:sa', strtotime( $error['created'] ) ); ?></td>
			<td>
				<a href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=mapping_errors&method=edit&id=' . $error['id'] ) ); ?>"><?php echo esc_html__( 'Edit', 'object-sync-for-salesforce' ); ?></a>
			</td>
			<td>
				<a href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=mapping_errors&method=delete&id=' . $error['id'] ) ); ?>"><?php echo esc_html__( 'Delete', 'object-sync-for-salesforce' ); ?></a>
			</td>
		</tr>
			<?php } ?>
		<?php endif; ?>
		<?php if ( ! empty( $mapping_errors['push_errors'] ) ) : ?>
			<?php foreach ( $mapping_errors['push_errors'] as $error ) { ?>
		<tr>
			<td><?php echo esc_html__( 'Push to Salesforce', 'object-sync-for-salesforce' ); ?></td>
			<td><?php echo $error['wordpress_id']; ?></td>
			<td><?php echo $error['wordpress_object']; ?></td>
			<td><?php echo $error['salesforce_id']; ?></td>
			<td><?php echo date_i18n( 'Y-m-d g:i:sa', strtotime( $error['created'] ) ); ?></td>
			<td>
				<a href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=mapping_errors&method=edit&id=' . $error['id'] ) ); ?>"><?php echo esc_html__( 'Edit', 'object-sync-for-salesforce' ); ?></a>
			</td>
			<td>
				<a href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=mapping_errors&method=delete&id=' . $error['id'] ) ); ?>"><?php echo esc_html__( 'Delete', 'object-sync-for-salesforce' ); ?></a>
			</td>
		</tr>
			<?php } ?>
		<?php endif; ?>
	</tbody>
</table>
