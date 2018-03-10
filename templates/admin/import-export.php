<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="export">
	<input type="hidden" name="action" value="object_sync_for_salesforce_export">
	<?php wp_nonce_field( 'object_sync_for_salesforce_export', 'object_sync_for_salesforce_nonce_export' ); ?>
	<p>
		<input type="checkbox" value="1" name="inactive" id="object-sync-for-salesforce-imex-ex" />
		<label for="widgetopts-imex-ex"><?php _e( 'Check this option if you wish to include inactive widgets', 'widget-options' ); ?></label>
	</p>
	<input type="submit" class="button button-primary" value="<?php _e( 'Export', 'object-sync-for-salesforce' ); ?>" />
</form>
