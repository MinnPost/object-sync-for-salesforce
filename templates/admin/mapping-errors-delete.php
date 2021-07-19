<?php
/**
 * The form to delete a mapping error.
 *
 * @package Object_Sync_Salesforce
 */

?>

<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
	<input type="hidden" name="redirect_url_error" value="<?php echo esc_url( $error_url ); ?>" />
	<input type="hidden" name="redirect_url_success" value="<?php echo esc_url( $success_url ); ?>" />
	<input type="hidden" name="id" value="<?php echo absint( $map_row['id'] ); ?>" />
	<input type="hidden" name="action" value="delete_object_map">
	<h2><?php echo esc_html__( 'Are you sure you want to delete this mapping object?', 'object-sync-for-salesforce' ); ?></h2>
	<p>
		<?php
		echo sprintf(
			// translators: the placeholders refer to: 1) the WordPress object name, 2) the WordPress object Id, and 3) the Salesforce object Id.
			esc_html__( 'This object map maps the WordPress %1$s with an id value of %2$s to the Salesforce object with Id of %3$s.', 'object-sync-for-salesforce' ),
			'<strong> ' . esc_html( $map_row['wordpress_object'] ) . '</strong>',
			'<strong> ' . esc_html( $map_row['wordpress_id'] ) . '</strong>',
			'<strong> ' . esc_html( $map_row['salesforce_id'] ) . '</strong>'
		);
		?>
	</p>
	<?php submit_button( esc_html__( 'Confirm deletion', 'object-sync-for-salesforce' ) ); ?>
</form>
