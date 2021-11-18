<?php
/**
 * The list of mapping errors, which are created when the plugin fails to connect a WordPress record to a Salesforce record.
 *
 * @package Object_Sync_Salesforce
 */

?>

<h2><?php echo esc_html__( 'Mapping Errors', 'object-sync-for-salesforce' ); ?></h2>
<p><?php echo esc_html__( 'When this tab is present, it means one or more mapping errors have occurred when the plugin has tried to save a new mapping object, either based on data pulled in from Salesforce or data that was sent to Salesforce. The plugin creates a temporary flag for WordPress (if it is a pull action) or for Salesforce (if it is a push action), and if it fails the temporary flag remains.', 'object-sync-for-salesforce' ); ?></p>
<p><?php echo esc_html__( 'For any mapping object error, you can edit (if, for example, you know the ID of the item that should be in place) or delete each database row, or you can try to track down what the plugin was doing based on the other data displayed here.', 'object-sync-for-salesforce' ); ?></p>
<p><?php echo esc_html__( 'If you edit one of these items, and it correctly maps data between the two systems, the sync for those items will behave as normal going forward, so any edits you do after that will sync as they should.', 'object-sync-for-salesforce' ); ?></p>

<?php require_once 'settings.php' ; ?>

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
				<td id="cb" class="manage-column column-cb check-column">
					<label class="screen-reader-text" for="cb-select-all-1"><?php echo esc_html__( 'Select All', 'object-sync-for-salesforce' ); ?></label>
					<input id="cb-select-all-1" type="checkbox">
				</td>
				<th id="mapping-error-type" class="manage-column"><?php echo esc_html__( 'Type', 'object-sync-for-salesforce' ); ?></th>
				<th id="mapping-error-wordpress-id" class="manage-column"><?php echo esc_html__( 'WordPress ID', 'object-sync-for-salesforce' ); ?></th>
				<th id="mapping-error-wordpress-type" class="manage-column"><?php echo esc_html__( 'WordPress Object Type', 'object-sync-for-salesforce' ); ?></th>
				<th id="mapping-error-salesforce-id" class="manage-column"><?php echo esc_html__( 'Salesforce ID', 'object-sync-for-salesforce' ); ?></th>
				<th id="mapping-error-created" class="manage-column"><?php echo esc_html__( 'Created Date/Time', 'object-sync-for-salesforce' ); ?></th>
				<th id="mapping-error-actions" class="manage-column" colspan="2"><?php echo esc_html__( 'Actions', 'object-sync-for-salesforce' ); ?></th>
			</tr>
		</thead>
		<tfoot>
			<tr>
				<td class="manage-column column-cb check-column">
					<label class="screen-reader-text" for="cb-select-all-2"><?php echo esc_html__( 'Select All', 'object-sync-for-salesforce' ); ?></label>
					<input id="cb-select-all-2" type="checkbox">
				</td>
				<th class="manage-column"><?php echo esc_html__( 'Type', 'object-sync-for-salesforce' ); ?></th>
				<th class="manage-column"><?php echo esc_html__( 'WordPress ID', 'object-sync-for-salesforce' ); ?></th>
				<th class="manage-column"><?php echo esc_html__( 'WordPress Object Type', 'object-sync-for-salesforce' ); ?></th>
				<th class="manage-column"><?php echo esc_html__( 'Salesforce ID', 'object-sync-for-salesforce' ); ?></th>
				<th class="manage-column"><?php echo esc_html__( 'Created Date/Time', 'object-sync-for-salesforce' ); ?></th>
				<th class="manage-column" colspan="2"><?php echo esc_html__( 'Actions', 'object-sync-for-salesforce' ); ?></th>
			</tr>
			<tr>
				<td colspan="4">
					<?php
						submit_button(
							esc_html__( 'Delete selected rows', 'object-sync-for-salesforce' )
						);
						?>
				</td>
				<td colspan="4">
					<?php
					$output  = '<div class="tablenav-pages tablenav-pages-mappingerrors">';
					$output .= '<span class="displaying-num">' . sprintf(
						/* translators: %s: Number of items. */
						_n( '%s item', '%s items', $mapping_errors['total'], 'object-sync-for-salesforce' ),
						number_format_i18n( $mapping_errors['total'] )
					) . '</span>';
					if ( $mapping_errors['pagination'] ) {
						$output .= $mapping_errors['pagination'];
					}
					$output .= '</div>';
					echo $output;
					?>
				</td>
			</tr>
		</tfoot>
		<tbody>
			<?php if ( ! empty( $mapping_errors['all_errors'] ) ) : ?>
				<?php foreach ( $mapping_errors['all_errors'] as $error ) { ?>
			<tr>
					<?php
					if ( in_array( $error['id'], $ids, true ) ) {
						$checked = ' checked';
					} else {
						$checked = '';
					}
					$trigger_type = '';
					if ( isset( $error['salesforce_id'] ) || isset( $error['wordpress_id'] ) ) {
						if ( strpos( $error['salesforce_id'], 'tmp_sf_' ) === 0 ) {
							$trigger_type = esc_html__( 'Pull From Salesforce', 'object-sync-for-salesforce' );
						} elseif ( strpos( $error['wordpress_id'], 'tmp_wp_' ) === 0 ) {
							$trigger_type = esc_html__( 'Push to Salesforce', 'object-sync-for-salesforce' );
						}
					}
					?>
				<th scope="row" class="check-column">
					<label class="screen-reader-text" for="delete_<?php echo $error['id']; ?>"><?php echo esc_html__( 'Select Error', 'object-sync-for-salesforce' ); ?></label>
					<input id="delete_<?php echo $error['id']; ?>" type="checkbox" name="delete[<?php echo $error['id']; ?>]"<?php echo $checked; ?>>
				</th>
				<td><?php echo $trigger_type; ?></td>
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
