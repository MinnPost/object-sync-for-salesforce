<input type="hidden" name="mapping_id" id="mapping_id_ajax" value="<?php echo absint( $mapping['id'] ); ?>" />
<input type="hidden" name="salesforce_id" id="salesforce_id_ajax" value="<?php echo esc_attr( $mapping['salesforce_id'] ); ?>" />
<input type="hidden" name="wordpress_id" id="wordpress_id_ajax" value="<?php echo absint( $mapping['wordpress_id'] ); ?>" />
<input type="hidden" name="wordpress_object" id="wordpress_object_ajax" value="<?php echo esc_attr( $mapping['wordpress_object'] ); ?>" />
<h2><?php echo esc_html__( 'Salesforce', 'object-sync-for-salesforce' ); ?></h2>
<table class="wp-list-table widefat striped mapped-salesforce-user">
	<caption><?php echo esc_html__( 'This user is mapped to a Salesforce object', 'object-sync-for-salesforce' ); ?></caption>
	<tbody>
		<tr>
			<th><?php echo esc_html__( 'Salesforce Id', 'object-sync-for-salesforce' ); ?></th>
			<td><a href="<?php echo esc_url( $this->salesforce['sfapi']->get_instance_url() . '/' . $mapping['salesforce_id'] ); ?>"><?php echo esc_attr( $mapping['salesforce_id'] ); ?></a></td>
			<td><a href="<?php echo esc_url( get_admin_url( null, 'user-edit.php?user_id=' . $user->ID ) . '&amp;edit_salesforce_mapping=true' ); ?>" class="edit-salesforce-mapping"><?php echo esc_html__( 'Edit', 'object-sync-for-salesforce' ); ?></a></td>
		</tr>
		<tr>
			<th><?php echo esc_html__( 'Last Sync Message', 'object-sync-for-salesforce' ); ?></th>
			<td class="last_sync_message"><?php echo isset( $mapping['last_sync_message'] ) ? esc_html( $mapping['last_sync_message'] ) : ''; ?></td>
			<td>&nbsp;</td>
		</tr>
		<tr>
			<th><?php echo esc_html__( 'Last Sync Action', 'object-sync-for-salesforce' ); ?></th>
			<td class="last_sync_action"><?php echo isset( $mapping['last_sync_action'] ) ? esc_html( $mapping['last_sync_action'] ) : ''; ?></td>
			<td>&nbsp;</td>
		</tr>
		<tr>
			<th><?php echo esc_html__( 'Last Sync Status', 'object-sync-for-salesforce' ); ?></th>
			<td class="last_sync_status"><?php echo ( isset( $mapping['last_sync_status'] ) && '1' === $mapping['last_sync_status'] ) ? esc_html__( 'success', 'object-sync-for-salesforce' ) : esc_html__( 'error', 'object-sync-for-salesforce' ); ?></td>
			<td>&nbsp;</td>
		</tr>
		<tr>
			<th><?php echo esc_html__( 'Last Sync', 'object-sync-for-salesforce' ); ?></th>
			<td class="last_sync"><?php echo isset( $mapping['last_sync'] ) ? esc_html( $mapping['last_sync'] ) : ''; ?></td>
			<td>&nbsp;</td>
		</tr>
		<tr>
			<th><?php echo esc_html__( 'Actions', 'object-sync-for-salesforce' ); ?></th>
			<td>
				<a href="#" class="button button-secondary push_to_salesforce_button"><?php echo esc_html__( 'Push to Salesforce', 'object-sync-for-salesforce' ); ?></a>
				<a href="#" class="button button-secondary pull_from_salesforce_button"><?php echo esc_html__( 'Pull from Salesforce', 'object-sync-for-salesforce' ); ?></a>
			</td>
		</tr>
	</tbody>
</table>
<div class="salesforce_user_ajax_message"></div>
