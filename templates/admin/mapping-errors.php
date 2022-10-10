<?php
/**
 * The list of mapping errors, which are created when the plugin fails to connect a WordPress record to a Salesforce record.
 *
 * @package Object_Sync_Salesforce
 */

?>

<h2><?php echo esc_html__( 'Mapping Errors', 'object-sync-for-salesforce' ); ?></h2>
<?php echo wp_kses_post( '<p>When this tab is present, it means an object map that connects a Salesforce record to a WordPress record has sync errors. This can happen when:</p><ol><li>A new mapping object was not able to finish saving data in either WordPress or Salesforce. When this happens, the plugin creates a temporary ID for WordPress (if it is a pull action) or for Salesforce (if it is a push action), and if it fails the temporary ID remains.</li><li>An existing mapping object was not able to save data in either WordPress or Salesforce. For example, when a row is deleted but the plugin is not set to track deletions.</li></ol><p>For any mapping object error on this screen, you can edit (if, for example, you know an ID should be in place instead) or delete each database row, or you can try to track down what the plugin was doing based on the other data displayed here.</p><p>If you edit one of these items, and it correctly maps data between the two systems, the sync for those items will behave as normal going forward, so any edits you do after that will sync as they should.</p>', 'object-sync-for-salesforce' ); ?>

<?php require_once 'settings.php'; ?>

<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="error-rows">
	<input type="hidden" name="redirect_url_error" value="<?php echo esc_url( $error_url ); ?>">
	<input type="hidden" name="redirect_url_success" value="<?php echo esc_url( $success_url ); ?>">
	<input type="hidden" name="action" value="delete_object_map">
	<?php if ( isset( $mapping_error_transient ) ) { ?>
	<input type="hidden" name="mapping_error_transient" value="<?php echo esc_html( $mapping_error_transient ); ?>">
	<?php } ?>
	<table class="wp-list-table widefat striped table-view-list">
		<thead>
			<tr>
				<td id="cb" class="manage-column column-cb check-column">
					<label class="screen-reader-text" for="cb-select-all-1"><?php echo esc_html__( 'Select All', 'object-sync-for-salesforce' ); ?></label>
					<input id="cb-select-all-1" type="checkbox">
				</td>
				<th id="mapping-error-label" class="manage-column"><?php echo esc_html__( 'Label', 'object-sync-for-salesforce' ); ?></th>
				<th id="mapping-error-last-action" class="manage-column"><?php echo esc_html__( 'Last Action', 'object-sync-for-salesforce' ); ?></th>
				<th id="mapping-error-created" class="manage-column"><?php echo esc_html__( 'Last Sync', 'object-sync-for-salesforce' ); ?></th>
				<th id="mapping-error-created" class="manage-column"><?php echo esc_html__( 'Object Map Created', 'object-sync-for-salesforce' ); ?></th>
				<th id="mapping-error-created" class="manage-column"><?php echo esc_html__( 'Last Data Update', 'object-sync-for-salesforce' ); ?></th>
			</tr>
		</thead>
		<tfoot>
			<tr>
				<td id="cb" class="manage-column column-cb check-column">
					<label class="screen-reader-text" for="cb-select-all-1"><?php echo esc_html__( 'Select All', 'object-sync-for-salesforce' ); ?></label>
					<input id="cb-select-all-1" type="checkbox">
				</td>
				<th id="mapping-error-label" class="manage-column"><?php echo esc_html__( 'Label', 'object-sync-for-salesforce' ); ?></th>
				<th id="mapping-error-last-action" class="manage-column"><?php echo esc_html__( 'Last Action', 'object-sync-for-salesforce' ); ?></th>
				<th id="mapping-error-created" class="manage-column"><?php echo esc_html__( 'Last Sync', 'object-sync-for-salesforce' ); ?></th>
				<th id="mapping-error-created" class="manage-column"><?php echo esc_html__( 'Object Map Created', 'object-sync-for-salesforce' ); ?></th>
				<th id="mapping-error-created" class="manage-column"><?php echo esc_html__( 'Last Data Update', 'object-sync-for-salesforce' ); ?></th>
			</tr>
			<tr>
				<td colspan="3">
					<?php
						submit_button(
							esc_html__( 'Delete selected rows', 'object-sync-for-salesforce' )
						);
						?>
				</td>
				<td colspan="3">
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
					echo wp_kses_post( $output );
					?>
				</td>
			</tr>
		</tfoot>
		<tbody>
			<?php if ( ! empty( $mapping_errors['all_errors'] ) ) : ?>
				<?php foreach ( $mapping_errors['all_errors'] as $mapping_error ) { ?>
			<tr>
					<?php
					if ( in_array( $mapping_error['id'], $ids, true ) ) {
						$checked = ' checked';
					} else {
						$checked = '';
					}
					$trigger_type = '';
					if ( isset( $mapping_error['salesforce_id'] ) || isset( $mapping_error['wordpress_id'] ) ) {
						if ( strpos( $mapping_error['salesforce_id'], 'tmp_sf_' ) === 0 ) {
							$trigger_type = esc_html__( 'Pull From Salesforce', 'object-sync-for-salesforce' );
						} elseif ( strpos( $mapping_error['wordpress_id'], 'tmp_wp_' ) === 0 ) {
							$trigger_type = esc_html__( 'Push to Salesforce', 'object-sync-for-salesforce' );
						} elseif ( '0' === $mapping_error['last_sync_status'] ) {
							if ( 'push' === $mapping_error['last_sync_action'] ) {
								$trigger_type = esc_html__( 'Push to Salesforce', 'object-sync-for-salesforce' );
							} elseif ( 'pull' === $mapping_error['last_sync_action'] ) {
								$trigger_type = esc_html__( 'Pull From Salesforce', 'object-sync-for-salesforce' );
							}
						}
					}
					?>
				<th scope="row" class="check-column">
					<label class="screen-reader-text" for="delete_<?php echo esc_attr( $mapping_error['id'] ); ?>"><?php echo esc_html__( 'Select Error', 'object-sync-for-salesforce' ); ?></label>
					<input id="delete_<?php echo esc_attr( $mapping_error['id'] ); ?>" type="checkbox" name="delete[<?php echo esc_attr( $mapping_error['id'] ); ?>]"<?php echo esc_html( $checked ); ?>>
				</th>
				<td>
					<strong>
						<?php
						echo sprintf(
							// translators: placeholders are 1) the WordPress object type, 2) the WordPress object ID, 3) the Salesforce object Id.
							esc_html__( 'WordPress %1$s ID %2$s to Salesforce Id %3$s', 'object-sync-for-salesforce' ),
							esc_attr( $mapping_error['wordpress_object'] ),
							esc_attr( $mapping_error['wordpress_id'] ),
							esc_attr( $mapping_error['salesforce_id'] )
						);
						?>
					</strong>
					<div>
						<?php
						echo sprintf(
							// translators: placeholder is the last sync message.
							esc_html__( 'Last Sync Message: %1$s', 'object-sync-for-salesforce' ),
							esc_attr( $mapping_error['last_sync_message'] )
						);
						?>
					</div>
					<div class="row-actions visible">
						<span class="edit">
						<a href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=mapping_errors&method=edit&id=' . $mapping_error['id'] ) ); ?>"><?php echo esc_html__( 'Edit Mapping Object', 'object-sync-for-salesforce' ); ?></a> | 
						</span>
						<?php if ( '' !== esc_url( $this->wordpress->object_edit_link( $mapping_error['wordpress_object'], $mapping_error['wordpress_id'] ) ) ) : ?>
							<span class="edit">
							<a href="<?php echo esc_url( $this->wordpress->object_edit_link( $mapping_error['wordpress_object'], $mapping_error['wordpress_id'] ) ); ?>">
								<?php
								echo sprintf(
									// translators: placeholder is the WordPress object type.
									esc_html__( 'Edit %1$s', 'object-sync-for-salesforce' ),
									esc_attr( ucfirst( $mapping_error['wordpress_object'] ) )
								);
								?>
							</a> | 
							</span>
						<?php endif; ?>
						<span class="delete">
						<a href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=mapping_errors&method=delete&id=' . $mapping_error['id'] ) ); ?>"><?php echo esc_html__( 'Delete Mapping Object', 'object-sync-for-salesforce' ); ?></a>
						<?php if ( '' !== esc_url( $this->wordpress->object_delete_link( $mapping_error['wordpress_object'], $mapping_error['wordpress_id'] ) ) ) : ?> | <?php endif; ?>
						</span>
						<?php if ( '' !== esc_url( $this->wordpress->object_delete_link( $mapping_error['wordpress_object'], $mapping_error['wordpress_id'] ) ) ) : ?>
							<span class="delete">
							<a href="<?php echo esc_url( $this->wordpress->object_delete_link( $mapping_error['wordpress_object'], $mapping_error['wordpress_id'] ) ); ?>">
								<?php
								echo sprintf(
									// translators: placeholder is the WordPress object type.
									esc_html__( 'Delete %1$s', 'object-sync-for-salesforce' ),
									esc_attr( ucfirst( $mapping_error['wordpress_object'] ) )
								);
								?>
							</a>
							</span>
						<?php endif; ?>
					</div>
					<button type="button" class="toggle-row"><span class="screen-reader-text">Show more details</span></button>
				</td>
				<td><?php echo esc_attr( $trigger_type ); ?></td>
				<td><?php echo esc_attr( wp_date( 'Y-m-d g:i:sa', strtotime( $mapping_error['last_sync'] ) ) ); ?></td>
				<td><?php echo esc_attr( wp_date( 'Y-m-d g:i:sa', strtotime( $mapping_error['created'] ) ) ); ?></td>
				<td><?php echo esc_attr( wp_date( 'Y-m-d g:i:sa', strtotime( $mapping_error['object_updated'] ) ) ); ?></td>
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
