<?php
/**
 * List of fieldmaps, which map a WordPress and Salesforce object type together.
 *
 * @package Object_Sync_Salesforce
 */

?>

<h3><?php echo esc_html__( 'Fieldmaps', 'object-sync-for-salesforce' ); ?> <a class="page-title-action" href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=fieldmaps&method=add' ) ); ?>"><?php echo esc_html__( 'Add New', 'object-sync-for-salesforce' ); ?></a></h3>
<table class="wp-list-table widefat striped table-view-list">
	<thead>
		<tr>
			<th class="manage-column column-title column-primary"><?php echo esc_html__( 'Label', 'object-sync-for-salesforce' ); ?></th>
			<th class="manage-column"><?php echo esc_html__( 'WordPress Object', 'object-sync-for-salesforce' ); ?></th>
			<th class="manage-column"><?php echo esc_html__( 'Salesforce Object', 'object-sync-for-salesforce' ); ?></th>
		</tr>
	</thead>
	<tfoot>
		<tr>
			<td colspan="6">
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
			</td>
		</tr>
	</tfoot>
	<tbody>
		<?php if ( count( $fieldmaps ) > 0 ) : ?>
			<?php foreach ( $fieldmaps as $record ) { ?>
		<tr>
			<td class="title column-title has-row-actions column-primary" data-colname="<?php echo esc_html__( 'Label', 'object-sync-for-salesforce' ); ?>">
				<strong>
					<?php echo esc_html( $record['label'] ); ?>
					<?php if ( 'active' !== $record['fieldmap_status'] ) : ?>
						&mdash; <?php echo esc_html( $record['fieldmap_status'] ); ?>
					<?php endif; ?>
				</strong>
				<div class="row-actions visible">
					<span class="edit">
						<a href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=fieldmaps&method=edit&id=' . $record['id'] ) ); ?>"><?php echo esc_html__( 'Edit', 'object-sync-for-salesforce' ); ?></a> | 
					</span>
					<span class="duplicate">
					<a href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=fieldmaps&method=clone&id=' . $record['id'] ) ); ?>"><?php echo esc_html__( 'Clone', 'object-sync-for-salesforce' ); ?></a> | 
					</span>
					<span class="delete">
					<a href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=fieldmaps&method=delete&id=' . $record['id'] ) ); ?>"><?php echo esc_html__( 'Delete', 'object-sync-for-salesforce' ); ?></a>
					</span>
				</div>
				<button type="button" class="toggle-row"><span class="screen-reader-text">Show more details</span></button>
			</td>
			<td data-colname="<?php echo esc_html__( 'WordPress Object', 'object-sync-for-salesforce' ); ?>"><?php echo esc_html( $record['wordpress_object'] ); ?></td>
			<td data-colname="<?php echo esc_html__( 'Salesforce Object', 'object-sync-for-salesforce' ); ?>"><?php echo esc_html( $record['salesforce_object'] ); ?></td>
		</tr>
			<?php } ?>
		<?php else : ?>
		<tr>
			<td colspan="4">
				<p>
				<?php
					// translators: the placeholders refer to: 1) the URL to add a fieldmap, 2) the link text for adding a fieldmap.
					echo sprintf(
						esc_html__( 'No fieldmaps exist yet. You can ', 'object-sync-for-salesforce' ) . '<a href="%1$s">%2$s</a>.',
						esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=fieldmaps&method=add' ) ),
						esc_html__( 'add one', 'object-sync-for-salesforce' )
					);
				?>
				</p>
			</td>
		</tr>
		<?php endif; ?>
	</tbody>
</table>
