<div class="wrap">
    <?php $this->plugin_options_tabs(); ?>
    <form method="post" action="options.php">
        <?php wp_nonce_field( 'update-options' ); ?>
        <?php settings_fields( $tab ); ?>
        <?php do_settings_sections( $tab ); ?>
        <?php submit_button(); ?>
    </form>
</div>