<h2><?php echo esc_html__( 'Mapping Errors', 'object-sync-for-salesforce' ); ?></h2>
<p><?php echo esc_html__( 'When this tab is present, it means one or more mapping errors have occurred when the plugin has tried to save a new mapping object, either based on data pulled in from Salesforce or data that was sent to Salesforce. The plugin creates a temporary flag for WordPress (if it is a pull action) or for Salesforce (if it is a push action), and if it fails the temporary flag remains.', 'object-sync-for-salesforce' ); ?></p>
<p><?php echo esc_html__( 'For any mapping object error, you can edit (if, for example, you know the ID of the item that should be in place) or delete each database row, or you can try to track down what the plugin was doing based on the other data displayed here.', 'object-sync-for-salesforce' ); ?></p>
<p><?php echo esc_html__( 'If you edit one of these items, and it correctly maps data between the two systems, the sync for those items will behave as normal going forward, so any edits you do after that will sync as they should.', 'object-sync-for-salesforce' ); ?></p>

<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="error-rows">
	<input type="hidden" name="redirect_url_error" value="<?php echo esc_url( $error_url ); ?>">
	<input type="hidden" name="redirect_url_success" value="<?php echo esc_url( $success_url ); ?>">
	<input type="hidden" name="action" value="delete_object_map">
	<?php if ( isset( $mapping_error_transient ) ) { ?>
	<input type="hidden" name="mapping_error_transient" value="<?php echo esc_html( $mapping_error_transient ); ?>">
	<?php } ?>
	<table class="widefat striped">
		<thead>
			<tr>
				<th>&nbsp;</th>
				<th><?php echo esc_html__( 'Type', 'object-sync-for-salesforce' ); ?></th>
				<th><?php echo esc_html__( 'WordPress ID', 'object-sync-for-salesforce' ); ?></th>
				<th><?php echo esc_html__( 'WordPress Object Type', 'object-sync-for-salesforce' ); ?></th>
				<th><?php echo esc_html__( 'Salesforce ID', 'object-sync-for-salesforce' ); ?></th>
				<th><?php echo esc_html__( 'Created Date/Time', 'object-sync-for-salesforce' ); ?></th>
				<th colspan="2"><?php echo esc_html__( 'Actions', 'object-sync-for-salesforce' ); ?></th>
			</tr>
		</thead>
		<tfoot>
			<tr>
				<td colspan="8">
					<?php
						submit_button(
							esc_html__( 'Delete selected rows', 'object-sync-for-salesforce' )
						);
						?>
				</td>
			</tr>
		</tfoot>
		<tbody>
			<?php if ( ! empty( $mapping_errors['pull_errors'] ) ) : ?>
				<?php foreach ( $mapping_errors['pull_errors'] as $error ) { ?>
			<tr>
					<?php
					if ( in_array( $error['id'], $ids ) ) {
						$checked = ' checked';
					} else {
						$checked = '';
					}
					?>
				<td><input type="checkbox" name="delete[<?php echo $error['id']; ?>]" id="delete_<?php echo $error['id']; ?>"<?php echo $checked; ?>></td>
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
					<?php
					if ( is_array( array_keys( $ids ) ) && in_array( $error['id'], array_keys( $ids ) ) ) {
						$checked = ' checked';
					} else {
						$checked = '';
					}
					?>
				<td><input type="checkbox" name="delete[<?php echo $error['id']; ?>]" id="delete_<?php echo $error['id']; ?>"<?php echo $checked; ?>></td>
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
</form>
