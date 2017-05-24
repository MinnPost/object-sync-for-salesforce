<input type="hidden" name="salesforce_update_mapped_user" value="1" />
<h2>Salesforce</h2>
<p>You can change the Salesforce object that this WordPress user maps to by changing the ID and updating this user.</p>
<table class="form-table">
	<tr>
		<th><label for="salesforce_id"><?php echo esc_html__( 'Salesforce ID', 'object-sync-for-salesforce' ); ?></label></th>
		<td>
			<input type="text" name="salesforce_id" id="salesforce_id" value="<?php if ( isset( $mapping['id'] ) ) { echo esc_html( $mapping['salesforce_id'] ); } ?>" class="regular-text" /><br />
			<span class="description"><?php echo esc_html__( 'Enter a Salesforce object ID.', 'object-sync-for-salesforce' ); ?></span>
		</td>
	</tr>
</table>
