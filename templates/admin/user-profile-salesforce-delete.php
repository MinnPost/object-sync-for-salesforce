<?php
/**
 * The functionality to delete a mapping between a Salesforce object and a given WordPress user
 *
 * @package Object_Sync_Salesforce
 */

?>

<input type="hidden" name="salesforce_delete_mapped_user" value="1" />
<input type="hidden" name="mapping_id" id="mapping_id_ajax" value="<?php echo absint( $mapping['id'] ); ?>" />
<h2><?php echo esc_html__( 'Salesforce', 'object-sync-for-salesforce' ); ?></h2>
<p><?php echo esc_html__( 'Confirm that you want to delete the relationship between this WordPress user and the Salesforce object it is connected to. No other data in Salesforce or WordPress will be modified.', 'object-sync-for-salesforce' ); ?></p>
<p><button type="submit" class="button button-primary delete_mapped_user_button" name="delete_mapped_user"><?php echo esc_html__( 'Confirm deletion', 'object-sync-for-salesforce' ); ?></button></p>
