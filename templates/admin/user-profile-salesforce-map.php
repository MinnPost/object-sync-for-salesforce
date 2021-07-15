<?php
/**
 * The form to create a map between a Salesforce object and a given WordPress user
 *
 * @package Object_Sync_Salesforce
 */

?>
<input type="hidden" name="salesforce_create_mapped_user" value="1" />
<h2><?php echo esc_html__( 'Salesforce', 'object-sync-for-salesforce' ); ?></h2>
<p><?php echo esc_html__( "This user is not mapped to an object in Salesforce. You can run a push to send this object to Salesforce, which will cause it to follow the plugin's normal mapping conventions, or you can create a manual link to a Salesforce object.", 'object-sync-for-salesforce' ); ?></p>
<table class="form-table">
	<tr>
		<th><label for="salesforce_id"><?php echo esc_html__( 'Salesforce ID', 'object-sync-for-salesforce' ); ?></label></th>
		<td>
			<input type="text" name="salesforce_id" id="salesforce_id" value="" class="regular-text" /><br />
			<span class="description"><?php echo esc_html__( 'Enter a Salesforce object ID.', 'object-sync-for-salesforce' ); ?></span>
			<p><strong>or</strong></p>
			<p><button type="submit" class="button button-secondary push_to_salesforce_button" name="push_new_user_to_salesforce"><?php echo esc_html__( 'Push to Salesforce as new record', 'object-sync-for-salesforce' ); ?></button></p>
		</td>
	</tr>
</table>
<div class="salesforce_user_ajax_message"></div>
