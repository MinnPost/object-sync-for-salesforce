<h3>Salesforce Demo</h3>
<p>Currently, we are using version <?php echo $this->login_credentials['rest_api_version']; ?> of the Salesforce REST API. Available versions are displayed below.</p>
<table class="widefat striped">
	<thead>
		<summary>
			<h4>Available Salesforce API versions. This list is <?php echo $versions_is_cached; ?> cached, <?php echo $versions_andorbut; ?> items <?php echo $versions_from_cache; ?> loaded from the cache. This is not an authenticated request, so it does not touch the Salesforce token.</h4>
		</summary>
		<tr>
			<th>Label</th>
			<th>URL</th>
			<th>Version</th>
		</tr>
	</thead>
	<tbody>
		<?php foreach ( $versions['data'] as $version ) { ?>
            <?php
            $class = '';
            if ( $version['version'] === $this->login_credentials['rest_api_version'] ) {
                $class = ' class="current"';
            }
            ?>
            <tr<?php echo $class; ?>>
            	<td><?php echo $version['label']; ?></td>
            	<td><?php echo $version['url']; ?></td>
            	<td><?php echo $version['version']; ?></td>
            </tr>
       <?php } ?>
	</tbody>
</table>

<table class="widefat striped">
	<thead>
		<summary>
			<h4>Salesforce successfully returned <?php echo $contacts['data']['totalSize']; ?> <?php echo $contacts['data']['records'][0]['attributes']['type']; ?> records. They are <?php echo $contacts_is_cached; ?>cached, <?php echo $contacts_andorbut; ?> they <?php echo $contacts_from_cache; ?> loaded from the cache. This request did <?php echo $contacts_is_redo; ?>require refreshing the Salesforce token.</h4>
		</summary>
		<tr>
			<th>Contact ID</th>
			<th>Name</th>
		</tr>
	</thead>
	<tbody>
		<?php foreach ( $contacts['data']['records'] as $contact ) { ?>
            <tr>
            	<td><?php echo $contact['Id']; ?></td>
            	<td><?php echo $contact['Name']; ?></td>
            </tr>
        <?php } ?>
	</tbody>
</table>