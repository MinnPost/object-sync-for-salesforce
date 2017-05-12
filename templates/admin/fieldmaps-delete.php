<form method="post" action="<?php echo admin_url( 'admin-post.php' ); ?>">
	<input type="hidden" name="redirect_url_error" value="<?php echo $error_url; ?>" />
	<input type="hidden" name="redirect_url_success" value="<?php echo $success_url; ?>" />
	<input type="hidden" name="id" value="<?php echo $map['id']; ?>" />
	<input type="hidden" name="action" value="delete_fieldmap">
	<h2>Are you sure you want to delete this fieldmap?</h2>
	<p>This fieldmap is called <strong><?php echo $map['label']; ?></strong> and it maps the Salesforce <?php echo $map['salesforce_object']; ?> object to the WordPress <?php echo $map['wordpress_object']; ?> object.</p>
	<?php echo submit_button( 'Confirm deletion' ); ?>
</form>
