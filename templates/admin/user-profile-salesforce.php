<input type="hidden" name="mapping_id" id="mapping_id_ajax" value="<?php echo $mapping['id']; ?>" />
<input type="hidden" name="salesforce_id" id="salesforce_id_ajax" value="<?php echo $mapping['salesforce_id']; ?>" />
<input type="hidden" name="wordpress_id" id="wordpress_id_ajax" value="<?php echo $mapping['wordpress_id']; ?>" />
<input type="hidden" name="wordpress_object" id="wordpress_object_ajax" value="<?php echo $mapping['wordpress_object']; ?>" />
<h2>Salesforce</h2>
<table class="wp-list-table widefat striped mapped-salesforce-user">
	<caption>This user is mapped to a Salesforce object</caption>
	<tbody>
		<tr>
			<th>Salesforce Id</th>
			<td><a href="<?php echo $this->salesforce['sfapi']->get_instance_url() . '/' . $mapping['salesforce_id']; ?>"><?php echo $mapping['salesforce_id']; ?></a></td>
			<td><a href="<?php echo get_admin_url( null, 'user-edit.php?user_id=' . $user->ID ) . '&amp;edit_salesforce_mapping=true'; ?>" class="edit-salesforce-mapping">Edit</a></td>
		</tr>
		<tr>
			<th>Last Sync Message</th>
			<td class="last_sync_message"><?php if ( isset( $mapping['last_sync_message'] ) ) { echo $mapping['last_sync_message']; } else { echo ''; } ?></td>
			<td>&nbsp;</td>
		</tr>
		<tr>
			<th>Last Sync Action</th>
			<td class="last_sync_action"><?php if ( isset( $mapping['last_sync_action'] ) ) { echo $mapping['last_sync_action']; } else { echo ''; } ?></td>
			<td>&nbsp;</td>
		</tr>
		<tr>
			<th>Last Sync Status</th>
			<td class="last_sync_status"><?php if ( isset( $mapping['last_sync_status'] ) && $mapping['last_sync_status'] === '1' ) { echo 'success'; } else if ( isset( $mapping['last_sync_status'] ) && $mapping['last_sync_status'] === '0' ) { echo 'error'; } else { echo ''; } ?></td>
			<td>&nbsp;</td>
		</tr>
		<tr>
			<th>Last Sync</th>
			<td class="last_sync"><?php if ( isset( $mapping['last_sync'] ) ) { echo $mapping['last_sync']; } else { echo ''; } ?></td>
			<td>&nbsp;</td>
		</tr>
		<tr>
			<th>Actions</th>
			<td>
				<a href="#" class="button button-secondary push_to_salesforce_button">Push to Salesforce</a>
				<a href="#" class="button button-secondary pull_from_salesforce_button">Pull from Salesforce</a>
			</td>
		</tr>
	</tbody>
</table>
<div class="salesforce_user_ajax_message"></div>
