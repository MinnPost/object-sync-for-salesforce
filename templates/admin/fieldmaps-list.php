<h3>Fieldmaps <a class="page-title-action" href="<?php echo get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=add' ); ?>">Add New</a></h3>
<table class="widefat striped">
    <thead>
        <tr>
            <th>Label</th>
            <th>WordPress Object</th>
            <th>Salesforce Object</th>
            <th colspan="3">Actions</th>
        </tr>
    </thead>
    <tbody>
        <?php if ( count( $fieldmaps ) > 0 ) {
            foreach ( $fieldmaps as $record ) { ?>
        <tr>
            <td><?php echo $record['label']; ?></td>
            <td><?php echo $record['wordpress_object']; ?></td>
            <td><?php echo $record['salesforce_object']; ?></td>
            <td>
                <a href="<?php echo get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=edit&id=' . $record['id'] ); ?>">Edit</a>
            </td>
            <td>
                <a href="<?php echo get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=clone&id=' . $record['id'] ); ?>">Clone</a>
            </td>
            <td>
                <a href="<?php echo get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=delete&id=' . $record['id'] ); ?>">Delete</a>
            </td>
            <td>
                <a href="<?php echo get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=export&id=' . $record['id'] ); ?>">Export</a>
            </td>
        </tr>
            <?php }
        } else { ?>
        <tr>
            <td colspan="4">
                <p>No fieldmaps exist yet. You can <a href="<?php echo get_admin_url( null, 'options-general.php?page=salesforce-api-admin&tab=fieldmaps&method=add' ); ?>">add one</a>.</p>
            </td>
        </tr>
        <?php } ?>
    </tbody>
</table>