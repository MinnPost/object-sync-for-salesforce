<h3><?php echo esc_html__( 'Export', 'object-sync-for-salesforce' ); ?></h3>
<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="export">
	<input type="hidden" name="action" value="object_sync_for_salesforce_export">
	<?php wp_nonce_field( 'object_sync_for_salesforce_nonce_export', 'object_sync_for_salesforce_nonce_export' ); ?>
	<p>
		<input type="checkbox" value="fieldmaps" name="export[]" id="object-sync-for-salesforce-export-fieldmaps">
		<label for="object-sync-for-salesforce-export-fieldmaps"><?php _e( 'Include Fieldmaps', 'object-sync-for-salesforce' ); ?></label>
	</p>
	<p>
		<input type="checkbox" value="object_maps" name="export[]" id="object-sync-for-salesforce-export-object-maps" />
		<label for="object-sync-for-salesforce-export-object-maps"><?php _e( 'Include Object Maps', 'object-sync-for-salesforce' ); ?></label>
	</p>
	<input type="submit" class="button button-primary" value="<?php _e( 'Export', 'object-sync-for-salesforce' ); ?>" />
</form>
