<form method="post" action="options.php">
	<?php
		settings_fields( $tab ) . do_settings_sections( $tab );
		submit_button( esc_html__( 'Save settings', 'object-sync-for-salesforce' ) );
	?>
</form>
