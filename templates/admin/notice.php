<?php
/**
 * The output for plugin notices
 *
 * @package Object_Sync_Salesforce
 */

?>

<div class="notice<?php echo esc_attr( $class ); ?><?php echo esc_attr( $dismissible ); ?>">
	<p>
	<?php
	$allowed_html = wp_kses_allowed_html( 'data' );
	echo wp_kses( $message, $allowed_html );
	?>
	</p>
</div>
