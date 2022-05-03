<?php
/**
 * The output for plugin notices
 *
 * @package Object_Sync_Salesforce
 */

?>

<div class="notice is-dismissible<?php echo esc_attr( $class ); ?>">
	<p>
	<?php
	$allowed_html = wp_kses_allowed_html( 'data' );
	echo wp_kses( $message, $allowed_html );
	?>
	</p>
</div>
