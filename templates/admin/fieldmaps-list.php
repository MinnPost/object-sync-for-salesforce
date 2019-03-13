<h3><?php echo esc_html__( 'Fieldmaps', 'object-sync-for-salesforce' ); ?> <a class="page-title-action" href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=fieldmaps&method=add' ) ); ?>"><?php echo esc_html__( 'Add New', 'object-sync-for-salesforce' ); ?></a></h3>
<table class="widefat striped">
	<thead>
		<tr>
			<th><?php echo esc_html__( 'Label', 'object-sync-for-salesforce' ); ?></th>
			<th><?php echo esc_html__( 'WordPress Object', 'object-sync-for-salesforce' ); ?></th>
			<th><?php echo esc_html__( 'Salesforce Object', 'object-sync-for-salesforce' ); ?></th>
			<th colspan="3"><?php echo esc_html__( 'Actions', 'object-sync-for-salesforce' ); ?></th>
		</tr>
	</thead>
	<tfoot>
		<tr>
			<td colspan="4">
				<p><small>
					<?php
					// translators: the placeholders refer to: 1) the cache clear link, 2) the cache clear link text
					echo sprintf( esc_html__( 'Has your WordPress or Salesforce data structure changed? ', 'object-sync-for-salesforce' ) . '<a href="%1$s" id="clear-sfwp-cache">%2$s</a>' . esc_html__( ' to make sure you can map the most recent data structures.', 'object-sync-for-salesforce' ),
						esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=clear_cache' ) ),
						esc_html__( 'Clear the plugin cache' )
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
			<td><?php echo esc_html( $record['label'] ); ?></td>
			<td><?php echo esc_html( $record['wordpress_object'] ); ?></td>
			<td><?php echo esc_html( $record['salesforce_object'] ); ?></td>
			<td>
				<a href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=fieldmaps&method=edit&id=' . $record['id'] ) ); ?>"><?php echo esc_html__( 'Edit', 'object-sync-for-salesforce' ); ?></a>
			</td>
			<td>
				<a href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=fieldmaps&method=clone&id=' . $record['id'] ) ); ?>"><?php echo esc_html__( 'Clone', 'object-sync-for-salesforce' ); ?></a>
			</td>
			<td>
				<a href="<?php echo esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=fieldmaps&method=delete&id=' . $record['id'] ) ); ?>"><?php echo esc_html__( 'Delete', 'object-sync-for-salesforce' ); ?></a>
			</td>
		</tr>
			<?php } ?>
		<?php else : ?>
		<tr>
			<td colspan="4">
				<p>
				<?php
					// translators: the placeholders refer to: 1) the fieldmap label, 2) the saleforce object name, and 3) the WordPress object name
					echo sprintf( esc_html__( 'No fieldmaps exist yet. You can ', 'object-sync-for-salesforce' ) . '<a href="%1$s">%2$s</a>.',
						esc_url( get_admin_url( null, 'options-general.php?page=object-sync-salesforce-admin&tab=fieldmaps&method=add' ) ),
						esc_html__( 'add one' )
					);
				?>
				</p>
			</td>
		</tr>
		<?php endif; ?>
	</tbody>
</table>
