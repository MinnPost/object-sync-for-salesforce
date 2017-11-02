<div class="wrap">
    <?php $this->plugin_options_tabs(); ?>
    <h2>Salesforce Authorization</h2>
    <?php if ( !$salesforce['is_authorized'] && SALESFORCE_CONSUMER_KEY !== '' && SALESFORCE_CONSUMER_SECRET !== '' && SALESFORCE_CALLBACK_URL !== '' && SALESFORCE_LOGIN_BASE_URL !== '') { ?>
    <p>Click the log in button to authorize WordPress access to your Salesforce installation. You will be sent to Salesforce to log in, and then will be sent back here. If authorization is successful, you'll see a list of up to 100 Contact objects from your Salesforce install.</p>
    <p class="submit">
    	<a href="<?php echo $salesforce['auth_url']; ?>" class="button button-primary">Log in with Salesforce</a>
    </p>
    <?php } else if ( $salesforce['is_authorized'] ) { ?>
    	<p>WordPress is successfully authorized to read data from your Salesforce installation. You can check this tab anytime to make sure.</p>
		<div>
		<?php
		foreach ( $records as $record ) {
		    print 'Name: ';
		    print htmlspecialchars( $record['Name'] );
		    print ' - ';
		    print htmlspecialchars( $record['Id'] );
		    print '<br/>';
		    print "\n";
		}
		?>
		</div>
	<?php } else { ?>
		<p>To authorize WordPress access to Salesforce, you need to add your consumer key, consumer secret, redirect URL, and login base URL. You can do that in your wp-config.php file, or in the <a href="<?php echo '?page=' . $this->plugin_name . '&tab=salesforce_settings'; ?>">settings of this plugin</a>.</p>
	<?php } ?>
</div>