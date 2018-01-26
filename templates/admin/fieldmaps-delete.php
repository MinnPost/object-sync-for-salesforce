<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
	<input type="hidden" name="redirect_url_error" value="<?php echo esc_url( $error_url ); ?>" />
	<input type="hidden" name="redirect_url_success" value="<?php echo esc_url( $success_url ); ?>" />
	<input type="hidden" name="id" value="<?php echo absint( $map['id'] ); ?>" />
	<input type="hidden" name="action" value="delete_fieldmap">
	<h2><?php echo esc_html__( 'Are you sure you want to delete this fieldmap?', 'object-sync-for-salesforce' ); ?></h2>
	<p>
	<?php
		// translators: the placeholders refer to: 1) the fieldmap label, 2) the saleforce object name, and 3) the WordPress object name
		echo sprintf( esc_html__( 'This fieldmap is called %1$s and it maps the Salesforce %2$s object to the WordPress %3$s object.', 'object-sync-for-salesforce' ),
			'<strong> ' . esc_html( $map['label'] ) . '</strong>',
			esc_html( $map['salesforce_object'] ),
			esc_html( $map['wordpress_object'] )
		);
	?>
	</p>
	<?php submit_button( esc_html__( 'Confirm deletion', 'object-sync-for-salesforce' ) ); ?>
</form>
