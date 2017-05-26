<form method="post" action="options.php">
	<?php
		settings_fields( $tab ) . do_settings_sections( $tab );
		submit_button( 'Save settings' );
	?>
</form>
