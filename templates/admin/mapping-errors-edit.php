<?php
/**
 * The form to edit a mapping error, connecting it to the correct record.
 *
 * @package Object_Sync_Salesforce
 */

?>

<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="fieldmap">
	<input type="hidden" name="redirect_url_error" value="<?php echo esc_url( $error_url ); ?>" />
	<input type="hidden" name="redirect_url_success" value="<?php echo esc_url( $success_url ); ?>" />
	<?php if ( isset( $transient ) ) { ?>
	<input type="hidden" name="transient" value="<?php echo esc_html( $transient ); ?>" />
	<?php } ?>
	<input type="hidden" name="action" value="post_object_map" >
	<input type="hidden" name="method" value="<?php echo esc_attr( $method ); ?>" />
	<?php if ( 'edit' === $method ) { ?>
	<input type="hidden" name="id" value="<?php echo absint( $map_row['id'] ); ?>" />
	<?php } ?>
	<div class="wordpress_id">
		<label for="wordpress_id"><?php echo esc_html__( 'WordPress Id', 'object-sync-for-salesforce' ); ?>: </label>
		<input type="text" id="wordpress_id" name="wordpress_id" required value="<?php echo isset( $wordpress_id ) ? esc_html( $wordpress_id ) : ''; ?>" />
	</div>
	<div class="salesforce_id">
		<label for="salesforce_id"><?php echo esc_html__( 'Salesforce Id', 'object-sync-for-salesforce' ); ?>: </label>
		<input type="text" id="salesforce_id" name="salesforce_id" required value="<?php echo isset( $salesforce_id ) ? esc_html( $salesforce_id ) : ''; ?>" />
	</div>
	<?php
		submit_button(
			// translators: the placeholder refers to the currently selected method (edit or delete).
			sprintf( esc_html__( '%1$s object map', 'object-sync-for-salesforce' ), ucfirst( $method ) )
		);
	?>
</form>
